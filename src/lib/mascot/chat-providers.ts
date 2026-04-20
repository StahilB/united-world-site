import { randomUUID } from "crypto";
import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher } from "undici";

type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;
type UndiciRequestInit = NonNullable<Parameters<typeof undiciFetch>[1]>;
import { MASCOT_SYSTEM_PROMPT } from "@/lib/mascot/system-prompt";
import type { MascotMessage, MascotRequest } from "@/lib/mascot/types";

/** Только для GigaChat: опционально отключить проверку TLS (диагностика). По умолчанию выкл. */
let gigachatInsecureAgent: Agent | undefined;

function getGigaChatDispatcher(): Dispatcher | undefined {
  if (process.env.GIGACHAT_ALLOW_INSECURE_SSL !== "true") {
    return undefined;
  }
  if (!gigachatInsecureAgent) {
    gigachatInsecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return gigachatInsecureAgent;
}

type MascotProvider = "anthropic" | "openai" | "gigachat" | "yandex";
type ErrorPhase = "oauth_token" | "model_request" | "stream_handling" | "response_parsing";

const USER_ERROR_TEMPORARY =
  "Помощник временно недоступен. Попробуйте еще раз через несколько секунд.";
const USER_ERROR_RETRY = "Не удалось получить ответ. Повторите запрос чуть позже.";
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.MASCOT_REQUEST_TIMEOUT_MS || "25000", 10);
const OAUTH_TIMEOUT_MS = Number.parseInt(process.env.MASCOT_OAUTH_TIMEOUT_MS || "12000", 10);

function logMascotFailure(params: {
  provider: MascotProvider;
  phase: ErrorPhase;
  status?: number;
  message: string;
}) {
  console.error(
    `[mascot] ${JSON.stringify({
      provider: params.provider,
      phase: params.phase,
      status: params.status,
      message: params.message.slice(0, 500),
    })}`,
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function undiciFetchWithTimeout(
  url: string,
  init: UndiciRequestInit,
  timeoutMs: number,
): Promise<UndiciResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await undiciFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function buildSystemPrompt(body: MascotRequest): string {
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
  provider?: MascotProvider,
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
      if (provider) {
        logMascotFailure({
          provider,
          phase: "response_parsing",
          message: "Malformed SSE data line ignored",
        });
      }
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
        logMascotFailure({
          provider: "anthropic",
          phase: "stream_handling",
          message: e instanceof Error ? e.message : String(e),
        });
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

function openaiCompatibleSseStream(
  upstream: ReadableStream<Uint8Array>,
  provider: MascotProvider,
): ReadableStream<Uint8Array> {
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
          }, provider);
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
          }, provider);
        }
      } catch (e) {
        logMascotFailure({
          provider,
          phase: "stream_handling",
          message: e instanceof Error ? e.message : String(e),
        });
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

/** Yandex FM (SSE): data: { JSON } с нарастающим message.text. */
function yandexSseStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";
  let lastText = "";

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
              result?: { alternatives?: Array<{ message?: { text?: string } }> };
            };
            const text = j.result?.alternatives?.[0]?.message?.text;
            if (text != null && text.length > lastText.length) {
              controller.enqueue(enc.encode(text.slice(lastText.length)));
              lastText = text;
            }
          }, "yandex");
        }
        if (lineBuffer.trim()) {
          parseSseDataLines(`${lineBuffer}\n`, (json) => {
            const j = json as {
              result?: { alternatives?: Array<{ message?: { text?: string } }> };
            };
            const text = j.result?.alternatives?.[0]?.message?.text;
            if (text != null && text.length > lastText.length) {
              controller.enqueue(enc.encode(text.slice(lastText.length)));
              lastText = text;
            }
          }, "yandex");
        }
      } catch (e) {
        logMascotFailure({
          provider: "yandex",
          phase: "stream_handling",
          message: e instanceof Error ? e.message : String(e),
        });
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

/** Yandex FM: поток строк JSON (NDJSON) с нарастающим полем text. */
function yandexNdjsonStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastText = "";

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const trimmed = raw.trim();
            if (!trimmed) continue;
            try {
              const j = JSON.parse(trimmed) as {
                result?: { alternatives?: Array<{ message?: { text?: string } }> };
              };
              const text = j.result?.alternatives?.[0]?.message?.text;
              if (text != null && text.length > lastText.length) {
                controller.enqueue(enc.encode(text.slice(lastText.length)));
                lastText = text;
              }
            } catch {
              // ignore incomplete lines
            }
          }
        }
        const tail = buffer.trim();
        if (tail) {
          try {
            const j = JSON.parse(tail) as {
              result?: { alternatives?: Array<{ message?: { text?: string } }> };
            };
            const text = j.result?.alternatives?.[0]?.message?.text;
            if (text != null && text.length > lastText.length) {
              controller.enqueue(enc.encode(text.slice(lastText.length)));
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        logMascotFailure({
          provider: "yandex",
          phase: "stream_handling",
          message: e instanceof Error ? e.message : String(e),
        });
        controller.error(e);
        return;
      }
      controller.close();
    },
  });
}

let gigachatTokenCache: { token: string; expiresAtMs: number } | null = null;

async function getGigaChatAccessToken(): Promise<string | null> {
  const authKey = process.env.GIGACHAT_AUTHORIZATION_KEY?.trim();
  if (!authKey) return null;

  const now = Date.now();
  if (gigachatTokenCache && gigachatTokenCache.expiresAtMs > now + 60_000) {
    return gigachatTokenCache.token;
  }

  const scope = process.env.GIGACHAT_OAUTH_SCOPE?.trim() || "GIGACHAT_API_PERS";
  const oauthUrl =
    process.env.GIGACHAT_OAUTH_URL?.trim() ||
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

  const dispatcher = getGigaChatDispatcher();
  let res: UndiciResponse;
  try {
    res = await undiciFetchWithTimeout(oauthUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: randomUUID(),
        Authorization: `Basic ${authKey}`,
      },
      body: new URLSearchParams({ scope }),
      dispatcher,
    }, OAUTH_TIMEOUT_MS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "gigachat",
      phase: "oauth_token",
      message: msg,
    });
    throw new Error(`GigaChat OAuth network error: ${msg}`);
  }

  if (!res.ok) {
    const t = await res.text();
    logMascotFailure({
      provider: "gigachat",
      phase: "oauth_token",
      status: res.status,
      message: t.slice(0, 300) || res.statusText,
    });
    throw new Error(`GigaChat OAuth: ${res.status} ${t.slice(0, 300)}`);
  }

  let data: { access_token: string; expires_at?: number };
  try {
    data = (await res.json()) as {
      access_token: string;
      expires_at?: number;
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "gigachat",
      phase: "response_parsing",
      message: `OAuth JSON parse failed: ${msg}`,
    });
    throw new Error("GigaChat OAuth: invalid JSON response");
  }
  if (!data.access_token) {
    logMascotFailure({
      provider: "gigachat",
      phase: "response_parsing",
      message: "OAuth response has no access_token",
    });
    throw new Error("GigaChat OAuth: нет access_token в ответе");
  }

  let expiresAtMs = now + 25 * 60_000;
  if (typeof data.expires_at === "number") {
    expiresAtMs =
      data.expires_at > 1e12 ? data.expires_at : data.expires_at * 1000;
  }

  gigachatTokenCache = { token: data.access_token, expiresAtMs };
  return data.access_token;
}

export async function streamAnthropic(system: string, messages: MascotMessage[], maxTokens: number) {
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

  let res: Response;
  try {
    res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
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
      },
      REQUEST_TIMEOUT_MS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "anthropic",
      phase: "model_request",
      message: msg,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_TEMPORARY }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.ok) {
    const t = await res.text();
    logMascotFailure({
      provider: "anthropic",
      phase: "model_request",
      status: res.status,
      message: t.slice(0, 400) || res.statusText,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_RETRY }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
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

export async function streamOpenAI(system: string, messages: MascotMessage[], maxTokens: number) {
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

  let res: Response;
  try {
    res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
      REQUEST_TIMEOUT_MS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "openai",
      phase: "model_request",
      message: msg,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_TEMPORARY }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.ok) {
    const t = await res.text();
    logMascotFailure({
      provider: "openai",
      phase: "model_request",
      status: res.status,
      message: t.slice(0, 400) || res.statusText,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_RETRY }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.body) {
    return new Response(JSON.stringify({ error: "Пустой ответ" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out = openaiCompatibleSseStream(res.body, "openai");
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function streamGigaChat(system: string, messages: MascotMessage[], maxTokens: number) {
  let accessToken: string;
  try {
    const t = await getGigaChatAccessToken();
    if (!t) {
      return new Response(
        JSON.stringify({
          error:
            "Сервис недоступен: задайте GIGACHAT_AUTHORIZATION_KEY (ключ из кабинета developers.sber.ru)",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    accessToken = t;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logMascotFailure({
      provider: "gigachat",
      phase: "oauth_token",
      message: msg,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_TEMPORARY }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model = process.env.MASCOT_GIGACHAT_MODEL?.trim() || "GigaChat";
  const apiUrl =
    process.env.GIGACHAT_API_URL?.trim() ||
    "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

  const gigachatMessages = [
    { role: "system" as const, content: system },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const dispatcher = getGigaChatDispatcher();
  let res: UndiciResponse;
  try {
    res = await undiciFetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model,
        messages: gigachatMessages,
        max_tokens: maxTokens,
        stream: true,
      }),
      dispatcher,
    }, REQUEST_TIMEOUT_MS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "gigachat",
      phase: "model_request",
      message: msg,
    });
    return new Response(
      JSON.stringify({ error: USER_ERROR_TEMPORARY }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!res.ok) {
    const t = await res.text();
    logMascotFailure({
      provider: "gigachat",
      phase: "model_request",
      status: res.status,
      message: t.slice(0, 400) || res.statusText,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_RETRY }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.body) {
    return new Response(JSON.stringify({ error: "Пустой ответ" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out = openaiCompatibleSseStream(
    res.body as ReadableStream<Uint8Array>,
    "gigachat",
  );
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function streamYandex(system: string, messages: MascotMessage[], maxTokens: number) {
  const apiKey = process.env.YANDEX_CLOUD_API_KEY?.trim();
  const modelUri = process.env.MASCOT_YANDEX_MODEL_URI?.trim();

  if (!apiKey || !modelUri) {
    return new Response(
      JSON.stringify({
        error:
          "Задайте YANDEX_CLOUD_API_KEY и MASCOT_YANDEX_MODEL_URI (см. консоль Yandex Cloud → Foundation Models)",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const completionUrl =
    process.env.YANDEX_COMPLETION_URL?.trim() ||
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

  const yandexMessages = [
    { role: "system", text: system },
    ...messages.map((m) => ({
      role: m.role,
      text: m.content,
    })),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Api-Key ${apiKey}`,
  };
  const folderId = process.env.YANDEX_CLOUD_FOLDER_ID?.trim();
  if (folderId) {
    headers["x-folder-id"] = folderId;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      completionUrl,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          modelUri,
          completionOptions: {
            stream: true,
            temperature: 0.3,
            maxTokens: String(maxTokens),
          },
          messages: yandexMessages,
        }),
      },
      REQUEST_TIMEOUT_MS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logMascotFailure({
      provider: "yandex",
      phase: "model_request",
      message: msg,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_TEMPORARY }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.ok) {
    const t = await res.text();
    logMascotFailure({
      provider: "yandex",
      phase: "model_request",
      status: res.status,
      message: t.slice(0, 400) || res.statusText,
    });
    return new Response(JSON.stringify({ error: USER_ERROR_RETRY }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.body) {
    return new Response(JSON.stringify({ error: "Пустой ответ" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ct = res.headers.get("content-type") || "";
  const out = ct.includes("text/event-stream")
    ? yandexSseStream(res.body)
    : yandexNdjsonStream(res.body);
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
