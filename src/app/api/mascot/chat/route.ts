import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/mascot/rate-limit";
import { buildSystemPrompt, streamGemini, streamGigaChat } from "@/lib/mascot/chat-providers";
import { buildMascotRetrievalContext } from "@/lib/mascot/retrieval";
import type { MascotRequest } from "@/lib/mascot/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== Rate limiter =====
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function checkRateLimitLocal(ip: string, maxPerMin: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMin) return false;
  entry.count++;
  return true;
}

// ===== Определение "простого" запроса про материалы =====
function isSimpleArticlesRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return /(последн|свеж|новы|новые|актуальн|материал|стать|публикац|что нового|latest|recent|articles)/.test(lower)
    && !/(про|о |об |насчёт|теме|автор|кто написал)/.test(lower);
}

// ===== Извлечение статей из контекста retrieval =====
function extractArticlesFromContext(contextText: string): Array<{ title: string; url: string }> {
  const articles: Array<{ title: string; url: string }> = [];
  const lines = contextText.split("\n");
  
  for (const line of lines) {
    // Формат ARTICLE:N|Заголовок|URL
    if (line.startsWith("ARTICLE:")) {
      const parts = line.split("|");
      if (parts.length >= 3 && parts[2].startsWith("http")) {
        articles.push({ title: parts[1], url: parts[2] });
      }
    }
    // Формат "Заголовок — URL" (из preformatted list)
    const dashMatch = line.match(/^(.+?)\s*—\s*(https?:\/\/.+)$/);
    if (dashMatch) {
      articles.push({ title: dashMatch[1].trim(), url: dashMatch[2].trim() });
    }
  }
  
  return articles;
}

// ===== Быстрый ответ без LLM для простых запросов =====
function buildDirectResponse(articles: Array<{ title: string; url: string }>): Response {
  let text: string;
  if (articles.length === 0) {
    text = "По этому запросу материалов на сайте пока нет. Вы можете воспользоваться поиском на https://anounitedworld.com/search или написать нам на official@anounitedworld.com";
  } else {
    text = `Вот последние материалы на сайте:\n\n${articles.map(a => `${a.title} — ${a.url}`).join("\n")}`;
  }
  
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({ start(c) { c.enqueue(encoder.encode(text)); c.close(); } }),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

// ===== Фоллбэк =====
async function runWithFallback(system: string, messages: MascotRequest["messages"], maxTokens: number, provider: string) {
  if (provider === "gemini" || provider === "gemini-gigachat-fallback") {
    try { return await streamGemini(system, messages, maxTokens); }
    catch (e) { console.warn(`[mascot] Gemini failed: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (provider === "gigachat" || provider === "gemini-gigachat-fallback") {
    try { return await streamGigaChat(system, messages, maxTokens); }
    catch (e) { console.error(`[mascot] GigaChat failed: ${e instanceof Error ? e.message : String(e)}`); }
  }
  throw new Error("Все провайдеры недоступны");
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const maxPerMin = Number.parseInt(process.env.MASCOT_RATE_LIMIT_PER_MIN || "10", 10);

  if (!checkRateLimitLocal(ip, maxPerMin)) {
    return new Response(JSON.stringify({ error: "Слишком много запросов. Подождите минуту." }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  let body: MascotRequest;
  try { body = (await req.json()) as MascotRequest; }
  catch { return new Response(JSON.stringify({ error: "Некорректный JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "Нет сообщений" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  for (const m of body.messages) {
    if (typeof m.content !== "string" || m.content.length > 2000) {
      return new Response(JSON.stringify({ error: "Сообщение слишком длинное" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return new Response(JSON.stringify({ error: "Некорректная роль сообщения" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  }

  const maxTokens = Number.parseInt(process.env.MASCOT_MAX_TOKENS || "800", 10);
  const pageUrl = body.pageUrl || "";
  const isEn = pageUrl.startsWith("/en/") || pageUrl === "/en";
  const localeContext = `${isEn ? "language=en" : "language=ru"}\npageUrl=${pageUrl}`;
  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";

  let retrievalContext = "";
  if (lastUserMessage.trim()) {
    try {
      const resolved = await buildMascotRetrievalContext(lastUserMessage);
      retrievalContext = resolved.contextText;
    } catch (e) {
      console.error(`[mascot] Retrieval failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ===== РЕШЕНИЕ: для простых запросов про статьи — НЕ идём в LLM =====
  if (lastUserMessage.trim() && isSimpleArticlesRequest(lastUserMessage)) {
    const articles = extractArticlesFromContext(retrievalContext);
    console.log(`[mascot] Direct response mode: ${articles.length} articles extracted`);
    if (articles.length > 0) {
      const duration = Date.now() - start;
      console.log(`[mascot] Direct response in ${duration}ms (no LLM, ${articles.length} articles)`);
      return buildDirectResponse(articles);
    }
    // Если статей нет — тоже отдаём прямой ответ
    const duration = Date.now() - start;
    console.log(`[mascot] Direct response in ${duration}ms (no LLM, 0 articles)`);
    return buildDirectResponse([]);
  }

  // ===== Для сложных вопросов — идём в LLM как обычно =====
  const mergedContext = [localeContext, body.context, retrievalContext].filter(Boolean).join("\n\n");
  const system = buildSystemPrompt({ ...body, context: mergedContext });
  const provider = (process.env.MASCOT_PROVIDER || "gemini-gigachat-fallback").toLowerCase();

  try {
    const response = await runWithFallback(system, body.messages, maxTokens, provider);
    const duration = Date.now() - start;
    console.log(`[mascot] LLM response in ${duration}ms (provider: ${provider}, ip: ${ip})`);
    return response;
  } catch (e) {
    const duration = Date.now() - start;
    console.error(`[mascot] LLM failed after ${duration}ms: ${e instanceof Error ? e.message : String(e)} (ip: ${ip})`);
    return new Response(JSON.stringify({ error: "Помощник временно недоступен. Попробуйте позже." }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET() {
  return new Response(JSON.stringify({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      provider: process.env.MASCOT_PROVIDER || "gemini-gigachat-fallback",
      cache: process.env.MASCOT_CACHE_ENABLED !== "false" ? "enabled" : "disabled",
      rateLimit: `max ${process.env.MASCOT_RATE_LIMIT_PER_MIN || 10}/min`,
      directMode: "enabled for simple article queries",
    },
  }), { headers: { "Content-Type": "application/json" } });
}
