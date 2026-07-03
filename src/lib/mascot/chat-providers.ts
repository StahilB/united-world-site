import { randomUUID } from "crypto";
import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher } from "undici";
import { MASCOT_SYSTEM_PROMPT } from "@/lib/mascot/system-prompt";
import type { MascotMessage, MascotRequest } from "@/lib/mascot/types";

type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;
type UndiciRequestInit = NonNullable<Parameters<typeof undiciFetch>[1]>;
type ProviderName = "gemini" | "gigachat";

// ===== Конфиг =====
const CONFIG = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    proxyUrl: (process.env.GEMINI_PROXY_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, ""),
    model: process.env.MASCOT_GEMINI_MODEL || "gemini-3.1-flash-lite",
    maxTokens: Number.parseInt(process.env.MASCOT_MAX_TOKENS || "800", 10),
    timeoutMs: Number.parseInt(process.env.MASCOT_REQUEST_TIMEOUT_MS || "25000", 10),
  },
  gigachat: {
    authKey: process.env.GIGACHAT_AUTHORIZATION_KEY || "",
    apiUrl: process.env.GIGACHAT_API_URL || "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
    model: process.env.MASCOT_GIGACHAT_MODEL || "GigaChat",
    scope: process.env.GIGACHAT_OAUTH_SCOPE || "GIGACHAT_API_PERS",
    oauthUrl: process.env.GIGACHAT_OAUTH_URL || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    timeoutMs: Number.parseInt(process.env.MASCOT_OAUTH_TIMEOUT_MS || "12000", 10),
    allowInsecure: process.env.GIGACHAT_ALLOW_INSECURE_SSL === "true",
  },
  cache: {
    enabled: process.env.MASCOT_CACHE_ENABLED !== "false",
    ttlMs: Number.parseInt(process.env.MASCOT_CACHE_TTL_MS || "300000", 10),
    maxSize: Number.parseInt(process.env.MASCOT_CACHE_MAX_SIZE || "100", 10),
  },
  logging: {
    level: (process.env.MASCOT_LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
    structured: process.env.MASCOT_LOG_STRUCTURED === "true",
  },
} as const;

// ===== Логгер =====
const logger = {
  _shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
    const levels = ["debug", "info", "warn", "error"] as const;
    return levels.indexOf(level) >= levels.indexOf(CONFIG.logging.level);
  },
  _format(level: string, msg: string, data?: Record<string, unknown>): string {
    if (CONFIG.logging.structured) {
      return JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data });
    }
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    return `${prefix} ${msg}${data ? " " + JSON.stringify(data) : ""}`;
  },
  debug: (msg: string, data?: Record<string, unknown>) => { if (logger._shouldLog("debug")) console.log(logger._format("debug", msg, data)); },
  info: (msg: string, data?: Record<string, unknown>) => { if (logger._shouldLog("info")) console.log(logger._format("info", msg, data)); },
  warn: (msg: string, data?: Record<string, unknown>) => { if (logger._shouldLog("warn")) console.warn(logger._format("warn", msg, data)); },
  error: (msg: string, data?: Record<string, unknown>) => { if (logger._shouldLog("error")) console.error(logger._format("error", msg, data)); },
};

// ===== LRU-кэш с TTL =====
type CacheEntry<T> = { data: T; expiresAt: number; accessCount: number };
class ResponseCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private maxSize: number, private defaultTtlMs: number) {
    setInterval(() => this._cleanup(), 300_000);
  }
  private _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
    if (this.store.size > this.maxSize) {
      const sorted = Array.from(this.store.entries()).sort((a, b) => a[1].accessCount - b[1].accessCount);
      for (let i = 0; i < sorted.length - this.maxSize; i++) this.store.delete(sorted[i][0]);
    }
  }
  private _key(prefix: string, args: unknown[]): string { return `${prefix}:${JSON.stringify(args).slice(0, 300)}`; }
  get(prefix: string, args: unknown[]): T | null {
    if (!CONFIG.cache.enabled) return null;
    const entry = this.store.get(this._key(prefix, args));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(this._key(prefix, args)); return null; }
    entry.accessCount++;
    return entry.data;
  }
  set(prefix: string, args: unknown[], data: T, ttlMs?: number): void {
    if (!CONFIG.cache.enabled) return;
    this.store.set(this._key(prefix, args), { data, expiresAt: Date.now() + (ttlMs || this.defaultTtlMs), accessCount: 1 });
    this._cleanup();
  }
}
const responseCache = new ResponseCache<unknown>(CONFIG.cache.maxSize, CONFIG.cache.ttlMs);

// ===== Утилиты запросов =====
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function undiciFetchWithTimeout(url: string, init: UndiciRequestInit, timeoutMs: number): Promise<UndiciResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await undiciFetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

// ===== Хэш для кэша: только последние сообщения =====
function hashForCache(prefix: string, system: string, messages: MascotMessage[], maxTokens: number): unknown[] {
  // Берём только последние 3 сообщения — так разные вопросы дают разные ответы
  const recentMessages = messages.slice(-3).map(m => `${m.role}:${m.content.slice(0, 150)}`).join("|");
  return [prefix, recentMessages, maxTokens];
}

// ===== СИСТЕМНЫЙ ПРОМПТ =====
export function buildSystemPrompt(body: MascotRequest): string {
  let system = MASCOT_SYSTEM_PROMPT;
  if (body.selectedText?.trim()) {
    system += `\n\n[ВЫДЕЛЕННЫЙ ФРАГМЕНТ: ${body.selectedText.trim()}]`;
  }
  if (body.context?.trim() && !body.context.includes(body.selectedText || "")) {
    system += `\n\n[Контекст со страницы: ${body.context.trim()}]`;
  }
  const pageBits = [body.pageTitle?.trim(), body.pageUrl?.trim()].filter(Boolean);
  if (pageBits.length > 0) {
    system += `\n\n[Страница: ${pageBits.join(" — ")}]`;
  }
  return system;
}

// ===== Парсер SSE (OpenAI-совместимый) =====
function parseOpenAiSse(upstream: ReadableStream<Uint8Array>, provider: ProviderName): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data: ") || line.slice(6) === "[DONE]") continue;
            try {
              const json = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
              const text = json.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(enc.encode(text));
            } catch (e) { logger.warn("SSE parse error", { provider, error: e instanceof Error ? e.message : String(e) }); }
          }
        }
      } catch (e) { logger.error("Stream error", { provider, error: e instanceof Error ? e.message : String(e) }); }
      finally { controller.close(); }
    },
  });
}

// ===== GigaChat Agent (создаётся один раз) =====
let gigachatToken: { token: string; expiresAt: number } | null = null;
let gigachatAgent: Agent | undefined;

function getGigaChatAgent(): Agent | undefined {
  if (!CONFIG.gigachat.allowInsecure) return undefined;
  if (!gigachatAgent) {
    gigachatAgent = new Agent({ connect: { rejectUnauthorized: false } });
    logger.debug("GigaChat insecure agent created");
  }
  return gigachatAgent;
}

// ===== GigaChat OAuth =====
async function getGigaChatToken(): Promise<string> {
  const now = Date.now();
  if (gigachatToken && gigachatToken.expiresAt > now + 60_000) return gigachatToken.token;
  const { authKey, oauthUrl, scope, timeoutMs } = CONFIG.gigachat;
  if (!authKey) throw new Error("GIGACHAT_AUTHORIZATION_KEY not set");
  
  const dispatcher = getGigaChatAgent();
  const res = await undiciFetchWithTimeout(oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: randomUUID(),
      Authorization: `Basic ${authKey}`,
    },
    body: new URLSearchParams({ scope }),
    dispatcher,
  }, timeoutMs);

  if (!res.ok) throw new Error(`GigaChat OAuth ${res.status}: ${await res.text().catch(() => "unknown")}`);
  const data = await res.json() as { access_token: string; expires_at?: number };
  if (!data.access_token) throw new Error("GigaChat OAuth: no access_token");
  const expiresAt = typeof data.expires_at === "number" ? (data.expires_at > 1e12 ? data.expires_at : data.expires_at * 1000) : now + 25 * 60_000;
  gigachatToken = { token: data.access_token, expiresAt };
  logger.info("GigaChat token refreshed", { expiresAt: new Date(expiresAt).toISOString() });
  return data.access_token;
}

// ===== Gemini (через прокси, без SSE) =====
export async function streamGemini(system: string, messages: MascotMessage[], maxTokens: number) {
  const cacheKey = hashForCache("gemini", system, messages, maxTokens);
  const cached = responseCache.get("response", cacheKey) as string | null;
  
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content.slice(0, 60) || "";
  
  if (cached) {
    logger.debug("Gemini cache HIT", { query: lastUserMsg });
    return new Response(
      new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(cached)); c.close(); } }),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }
  logger.info("Gemini cache MISS", { query: lastUserMsg });

  const { apiKey, proxyUrl, model, maxTokens: maxTok, timeoutMs } = CONFIG.gemini;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const payload = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: maxTok, temperature: 0.1 },
  };

  logger.info("Calling Gemini", { model, proxyUrl: proxyUrl.replace(/https?:\/\//, "") });
  const res = await fetchWithTimeout(
    `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    timeoutMs,
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    logger.error("Gemini API error", { status: res.status, error: err.slice(0, 200) });
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  responseCache.set("response", cacheKey, text);
  logger.info("Gemini response cached", { chars: text.length, model, query: lastUserMsg });

  const enc = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({ start(c) { c.enqueue(enc.encode(text)); c.close(); } }),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

// ===== GigaChat (с обходом SSL) =====
export async function streamGigaChat(system: string, messages: MascotMessage[], maxTokens: number) {
  const cacheKey = hashForCache("gigachat", system, messages, maxTokens);
  const cached = responseCache.get("response", cacheKey) as string | null;
  
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content.slice(0, 60) || "";
  
  if (cached) {
    logger.debug("GigaChat cache HIT", { query: lastUserMsg });
    return new Response(
      new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(cached)); c.close(); } }),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }
  logger.info("GigaChat cache MISS", { query: lastUserMsg });

  const token = await getGigaChatToken();
  const { apiUrl, model, timeoutMs } = CONFIG.gigachat;
  const gigachatMessages = [
    { role: "system" as const, content: system },
    ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  logger.info("Calling GigaChat", { model, apiUrl: apiUrl.replace(/https?:\/\//, "") });

  const dispatcher = getGigaChatAgent();
  const res = await undiciFetchWithTimeout(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: gigachatMessages,
      max_tokens: maxTokens,
      stream: true,
    }),
    dispatcher,
  }, timeoutMs);

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    logger.error("GigaChat API error", { status: res.status, error: err.slice(0, 200) });
    throw new Error(`GigaChat ${res.status}: ${err}`);
  }
  if (!res.body) throw new Error("GigaChat: empty response body");

  logger.info("GigaChat stream started");
  return new Response(parseOpenAiSse(res.body as ReadableStream<Uint8Array>, "gigachat"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
