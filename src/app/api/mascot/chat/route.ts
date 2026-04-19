import { NextRequest } from "next/server";
import { MASCOT_SYSTEM_PROMPT } from "@/lib/mascot/system-prompt";
import { checkRateLimit } from "@/lib/mascot/rate-limit";
import type { MascotMessage, MascotRequest } from "@/lib/mascot/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSystemPrompt(body: MascotRequest): string {
  let system = MASCOT_SYSTEM_PROMPT;
  if (body.context?.trim()) {
    system += `\n\n[Контекст со страницы: ${body.context.trim()}]`;
  }
  const pageBits = [body.pageTitle?.trim(), body.pageUrl?.trim()].filter(Boolean);
  if (pageBits.length > 0) {
    system += `\n\n[Страница: ${pageBits.join(" — ")}]`;
  }
  return system;
}

function parseSseDataLines(
  buffer: string,
  onJson: (data: unknown) => void,
): string {
  const lines = buffer.split("\n");
  const incomplete = lines.pop() ?? "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6);
    if (payload === "[DONE]") continue;
    try {
      onJson(JSON.parse(payload));
    } catch {
      // ignore
    }
  }
  return incomplete;
}

function anthropicTextStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          lineBuffer = parseSseDataLines(lineBuffer, (json) => {
            const j = json as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (
              j.type === "content_block_delta" &&
              j.delta?.type === "text_delta" &&
              j.delta.text
            ) {
              controller.enqueue(enc.encode(j.delta.text));
            }
          });
        }
        if (lineBuffer.trim()) {
          parseSseDataLines(`${lineBuffer}\n`, (json) => {
            const j = json as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (
              j.type === "content_block_delta" &&
              j.delta?.type === "text_delta" &&
              j.delta.text
            ) {
              controller.enqueue(enc.encode(j.delta.text));
            }
          });
        }
      } catch (e) {
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

function openaiTextStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          lineBuffer = parseSseDataLines(lineBuffer, (json) => {
            const j = json as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const piece = j.choices?.[0]?.delta?.content;
            if (piece) {
              controller.enqueue(enc.encode(piece));
            }
          });
        }
        if (lineBuffer.trim()) {
          parseSseDataLines(`${lineBuffer}\n`, (json) => {
            const j = json as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const piece = j.choices?.[0]?.delta?.content;
            if (piece) {
              controller.enqueue(enc.encode(piece));
            }
          });
        }
      } catch (e) {
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

async function streamAnthropic(system: string, messages: MascotMessage[], maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Сервис временно недоступен (нет ключа Anthropic)" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const model =
    process.env.MASCOT_ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const anthropicMessages = messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return new Response(
      JSON.stringify({
        error: `Anthropic: ${t.slice(0, 400) || res.statusText}`,
      }),
      { status: res.status, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!res.body) {
    return new Response(JSON.stringify({ error: "Пустой ответ" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out = anthropicTextStream(res.body);
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function streamOpenAI(system: string, messages: MascotMessage[], maxTokens: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Сервис временно недоступен (нет ключа OpenAI)" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const model = process.env.MASCOT_OPENAI_MODEL || "gpt-5-mini";

  const openaiMessages = [
    { role: "system" as const, content: system },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return new Response(
      JSON.stringify({
        error: `OpenAI: ${t.slice(0, 400) || res.statusText}`,
      }),
      { status: res.status, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!res.body) {
    return new Response(JSON.stringify({ error: "Пустой ответ" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out = openaiTextStream(res.body);
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const maxPerMin = Number.parseInt(
    process.env.MASCOT_RATE_LIMIT_PER_MIN || "10",
    10,
  );
  if (!checkRateLimit(ip, maxPerMin)) {
    return new Response(
      JSON.stringify({ error: "Слишком много запросов. Подождите минуту." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let body: MascotRequest;
  try {
    body = (await req.json()) as MascotRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Некорректный JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "Нет сообщений" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const m of body.messages) {
    if (typeof m.content !== "string" || m.content.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Сообщение слишком длинное" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return new Response(JSON.stringify({ error: "Некорректная роль сообщения" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const maxTokens = Number.parseInt(process.env.MASCOT_MAX_TOKENS || "500", 10);
  const system = buildSystemPrompt(body);
  const provider = (process.env.MASCOT_PROVIDER || "anthropic").toLowerCase();

  if (provider === "openai") {
    return streamOpenAI(system, body.messages, maxTokens);
  }
  return streamAnthropic(system, body.messages, maxTokens);
}
