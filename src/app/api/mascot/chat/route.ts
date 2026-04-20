import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/mascot/rate-limit";
import {
  buildSystemPrompt,
  streamAnthropic,
  streamGigaChat,
  streamOpenAI,
  streamYandex,
} from "@/lib/mascot/chat-providers";
import { buildMascotRetrievalContext } from "@/lib/mascot/retrieval";
import type { MascotRequest } from "@/lib/mascot/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const lastUserMessage =
    [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  let retrievalContext = "";
  if (lastUserMessage.trim()) {
    try {
      const resolved = await buildMascotRetrievalContext(lastUserMessage);
      retrievalContext = resolved.contextText;
    } catch (e) {
      console.error(
        `[mascot] ${JSON.stringify({
          provider: "retrieval",
          phase: "strategy_resolver",
          message: e instanceof Error ? e.message : String(e),
        })}`,
      );
    }
  }
  const mergedContext = [body.context, retrievalContext].filter(Boolean).join("\n\n");
  const system = buildSystemPrompt({ ...body, context: mergedContext });
  const provider = (process.env.MASCOT_PROVIDER || "gigachat").toLowerCase();

  switch (provider) {
    case "openai":
      return streamOpenAI(system, body.messages, maxTokens);
    case "anthropic":
    case "claude":
      return streamAnthropic(system, body.messages, maxTokens);
    case "gigachat":
    case "giga":
      return streamGigaChat(system, body.messages, maxTokens);
    case "yandex":
    case "yandexgpt":
      return streamYandex(system, body.messages, maxTokens);
    default:
      return new Response(
        JSON.stringify({
          error: `Неизвестный MASCOT_PROVIDER=${provider}. Допустимо: openai, anthropic, gigachat, yandex`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
  }
}
