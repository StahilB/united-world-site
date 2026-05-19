/**
 * Telegram → Strapi: publish articles.
 * Production version: Multi-domain URLs + safe slug extraction + docx updates.
 */
require("dotenv").config();
console.log("[boot] telegram-bot starting...");

const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { Telegraf, Input } = require("telegraf");

const { parseFirstMessage, telegramToHtml, resolveCategorySlug, resolveRegionSlug, normalizeFormatSlug } = require("./parser");
const { parseDocxArticle } = require("./docx-parser");
const { createStrapiClient } = require("./strapi-client");
const { slugFromTitle, readingTimeMinutes } = require("./utils");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing env: ${name}`); process.exit(1); }
  return v;
}

const BOT_TOKEN = requireEnv("BOT_TOKEN");
const CHANNEL_ID = requireEnv("CHANNEL_ID");
const STRAPI_URL = requireEnv("STRAPI_URL");
const STRAPI_TOKEN = requireEnv("STRAPI_TOKEN");
const STRAPI_PUBLIC_URL = (process.env.STRAPI_PUBLIC_URL || STRAPI_URL).replace(/\/$/, "");
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const SITE_URL_EN = process.env.SITE_URL_EN || "https://en.anounitedworld.com";

const strapi = createStrapiClient({ baseUrl: STRAPI_URL, token: STRAPI_TOKEN });
const bot = new Telegraf(BOT_TOKEN);

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
const pendingArticles = new Map();
const PUBLISH_AFTER_MS = 5 * 60 * 1000;

const pendingDocx = new Map();
const DOCX_TIMEOUT_MS = 10 * 60 * 1000;

function siteBase() { return SITE_URL.replace(/\/$/, ""); }

// 🔹 Генерация ссылки с учётом языка и домена
function articleUrl(slug, isEnglish = false) {
  const base = isEnglish ? SITE_URL_EN.replace(/\/$/, "") : siteBase();
  return `${base}/articles/${slug}`;
}

function detectArticleLanguage(title) {
  if (!title) return "ru";
  if (/[\u0400-\u04FF]/.test(title)) return "ru";
  if (/[A-Za-z]/.test(title)) return "en";
  return "ru";
}

async function ensureAuthorId(name) {
  if (!name?.trim()) return null;
  const found = await strapi.findAuthorByName(name);
  if (found) return found.id;
  let base = slugFromTitle(name) || "author";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${Date.now()}`;
    try { const c = await strapi.createAuthor(name.trim(), slug); if (c?.id) return c.id; }
    catch (e) { if (e.status === 400 && i < 4) continue; throw e; }
  }
  return null;
}

async function createArticleWithUniqueSlug(title, createFn) {
  const base = slugFromTitle(title);
  let attempt = 0, lastErr = null;
  while (attempt < 8) {
    const slug = attempt === 0 ? base : `${base}-${Date.now().toString(36)}-${attempt}`;
    try { return await createFn(slug); } catch (e) {
      lastErr = e; const msg = String(e.message || "");
      if (msg.includes("unique") || msg.includes("slug") || e.status === 400) { attempt++; continue; }
      throw e;
    }
  }
  throw lastErr || new Error("Could not allocate unique slug");
}

function stripHtml(html) { return String(html || "").replace(/<[^>]+>/g, ""); }
function pickPhotoFileId(msg) { return msg?.photo?.length ? msg.photo[msg.photo.length - 1]?.file_id : null; }

function resetTimer(chatId) {
  const p = pendingArticles.get(chatId);
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  p.timer = setTimeout(() => finalizePublish(chatId, { reason: "timeout" }).catch(console.error), PUBLISH_AFTER_MS);
}

function cleanupDocx(chatId, reason = "timeout") {
  const p = pendingDocx.get(chatId);
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  pendingDocx.delete(chatId);
  if (reason === "timeout") bot.telegram.sendMessage(chatId, "⏳ Время ожидания истекло. Отправьте файл заново.").catch(()=>{});
}

async function downloadTelegramPhoto(fileId) {
  if (!fileId) return { buffer: null, filename: null };
  const link = await bot.telegram.getFileLink(fileId);
  const res = await fetch(link.href);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = (link.pathname || "").split(".").pop()?.split("?")[0] || "jpg";
  return { buffer, filename: `cover.${ext}` };
}

async function downloadFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200 && res.statusCode !== 302) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject); req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ─────────────────────────────────────────────────────────────
// TEXT ARTICLES
// ─────────────────────────────────────────────────────────────
async function finalizePublish(chatId, { reason, replyToMessageId } = {}) {
  const pending = pendingArticles.get(chatId);
  if (!pending) { if (replyToMessageId) await bot.telegram.sendMessage(chatId, "ℹ️ Нет незаконченной статьи.", { reply_to_message_id: replyToMessageId }); return; }
  if (pending.timer) clearTimeout(pending.timer); pendingArticles.delete(chatId);
  try {
    const htmlBody = telegramToHtml(pending.bodyParts.join("\n").trim());
    const plainText = stripHtml(htmlBody);
    const excerpt = pending.excerptOverride || plainText.replace(/\s+/g, " ").trim().slice(0, 280);
    const readingTime = readingTimeMinutes(plainText);
    let categoryId = null, regionId = null;
    if (pending.categorySlug) { const c = await strapi.findCategoryBySlug(pending.categorySlug); if (c) categoryId = c.id; }
    if (pending.regionSlug) { const r = await strapi.findRegionBySlug(pending.regionSlug); if (r) regionId = r.id; }
    const authorId = pending.authorName ? await ensureAuthorId(pending.authorName) : null;
    let coverImageId = null;
    if (pending.photoFileId) {
      try { const { buffer, filename } = await downloadTelegramPhoto(pending.photoFileId); if (buffer) coverImageId = await strapi.uploadImage(buffer, filename || "cover.jpg"); }
      catch (e) { console.error("[publish] Upload cover failed:", e?.message || e); }
    }
    
    const result = await createArticleWithUniqueSlug(pending.title, async (slug) =>
      strapi.createArticle({ title: pending.title, slug, htmlBody, excerpt, format: pending.format || "анализ", publicationDate: new Date().toISOString(), readingTime, authorId, categoryId, regionId, coverImageId, isEnglish: false })
    );
    
    // 🔹 Безопасное извлечение slug (поддерживает плоский ответ и Strapi v5)
    const slug = result?.slug || result?.data?.attributes?.slug || result?.id;
    if (!slug) throw new Error("Не удалось получить slug из ответа Strapi");
    
    const isEnglish = detectArticleLanguage(pending.title) === "en";
    const url = articleUrl(slug, isEnglish);
    await bot.telegram.sendMessage(chatId, `✅ ${reason === "timeout" ? "Опубликовано (авто)" : "Опубликовано"}:\n📰 ${pending.title}\n ${url}`, { reply_to_message_id: replyToMessageId || pending.lastMessageId, disable_web_page_preview: false });
  } catch (e) { await bot.telegram.sendMessage(chatId, `❌ Ошибка: ${e.message || String(e)}`, { reply_to_message_id: replyToMessageId || pending.lastMessageId }); }
}

// ─────────────────────────────────────────────────────────────
// DOCX HANDLING
// ────────────────────────────────────────────────────────────
async function finalizeDocxAction(chatId) {
  const state = pendingDocx.get(chatId);
  if (!state) return;
  clearTimeout(state.timer);
  pendingDocx.delete(chatId);

  try {
    const { parsed, isUpdate, selectedId, isEnglish } = state;
    let htmlFinal = parsed.bodyHtml;
    let coverImageId = null;

    for (const img of parsed.images) {
      const ext = (img.contentType || "image/png").split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
      const filename = `article-img-${Date.now()}-${img.index}.${ext}`;
      const uploaded = await strapi.uploadMedia(img.buffer, filename, img.contentType || "image/png");
      
      if (!uploaded) {
        htmlFinal = htmlFinal.replace(new RegExp(`<img[^>]*src=["']?__IMG_PLACEHOLDER_${img.index}__["']?[^>]*>`, "gi"), "");
        continue;
      }
      
      const imgUrl = uploaded.url.startsWith("http") ? uploaded.url : `${STRAPI_PUBLIC_URL}${uploaded.url}`;
      
      if (img.index === 0) {
        coverImageId = uploaded.id;
        htmlFinal = htmlFinal.replace(new RegExp(`<img[^>]*src=["']?__IMG_PLACEHOLDER_${img.index}__["']?[^>]*>`, "gi"), "");
      } else {
        htmlFinal = htmlFinal.replace(new RegExp(`__IMG_PLACEHOLDER_${img.index}__`, "g"), imgUrl);
      }
    }

    if (isUpdate) {
      const updateData = {};
      if (isEnglish) {
        updateData.title_en = parsed.meta.title;
        updateData.excerpt_en = parsed.meta.excerpt;
        updateData.content_html_en = htmlFinal;
        updateData.is_translated_en = true;
      } else {
        updateData.title = parsed.meta.title;
        updateData.excerpt = parsed.meta.excerpt;
        updateData.content_html = htmlFinal;
      }
      
      const result = await strapi.updateArticle(selectedId, updateData);
      
      //  Безопасное извлечение slug
      const slug = result?.slug || result?.data?.attributes?.slug || parsed.meta.slug || selectedId;
      if (!slug) throw new Error("Не удалось получить slug при обновлении");
      
      const url = articleUrl(slug, isEnglish);
      await bot.telegram.sendMessage(chatId, `✅ Статья обновлена!\n📰 ${parsed.meta.title}\n🔗 ${url}`, { reply_to_message_id: state.lastMessageId });
    } else {
      let authorId = null, categoryId = null, regionId = null;
      if (parsed.meta.author) authorId = await ensureAuthorId(parsed.meta.author);
      if (parsed.meta.category) { const c = await strapi.findCategoryBySlug(resolveCategorySlug(parsed.meta.category)); if (c) categoryId = c.id; }
      if (parsed.meta.region) { 
        const regionClean = parsed.meta.region.trim().replace(/\s+/g, "");
        const r = await strapi.findRegionBySlug(resolveRegionSlug(regionClean)); 
        if (r) regionId = r.id; 
      }

      const plainText = htmlFinal.replace(/<[^>]+>/g, " ").trim();
      const readingTime = readingTimeMinutes(plainText);
      const format = parsed.meta.format ? normalizeFormatSlug(parsed.meta.format) : "анализ";

      const result = await createArticleWithUniqueSlug(parsed.meta.title, async (slug) =>
        strapi.createArticle({
          title: parsed.meta.title, slug, htmlBody: htmlFinal, excerpt: parsed.meta.excerpt, format,
          authorId, categoryId, regionId, coverImageId, readingTime,
          publicationDate: new Date().toISOString(), isEnglish
        })
      );
      
      // 🔹 Безопасное извлечение slug
      const slug = result?.slug || result?.data?.attributes?.slug || result?.id;
      if (!slug) throw new Error("Не удалось получить slug из ответа Strapi");
      
      const url = articleUrl(slug, isEnglish);
      await bot.telegram.sendMessage(chatId, `✅ ${isEnglish ? "🌐 EN" : "📰 RU"} статья опубликована!\n📰 ${parsed.meta.title}\n🔗 ${url}`, { reply_to_message_id: state.lastMessageId });
    }
  } catch (e) {
    console.error("[docx/action] error:", e);
    await bot.telegram.sendMessage(chatId, `❌ Ошибка: ${e.message || String(e)}`);
  }
}

async function handleDocumentUpload(ctx) {
  try {
    const msg = ctx.message || ctx.channelPost;
    const chatId = String(msg?.chat?.id ?? "");
    if (chatId !== String(CHANNEL_ID)) return;
    const doc = msg.document;
    if (!doc) return;
    const isDocx = doc.mime_type?.includes("officedocument") || doc.file_name?.toLowerCase().endsWith(".docx");
    if (!isDocx) { await ctx.telegram.sendMessage(msg.chat.id, "❌ Только .docx по шаблону.", { reply_to_message_id: msg.message_id }); return; }    
    if (doc.file_size > 20 * 1024 * 1024) { await ctx.telegram.sendMessage(msg.chat.id, "❌ Файл >20 МБ.", { reply_to_message_id: msg.message_id }); return; }
    
    await ctx.telegram.sendMessage(msg.chat.id, "📥 Получил файл, разбираю...", { reply_to_message_id: msg.message_id });
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    let buffer = null, lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try { buffer = await downloadFileFromUrl(fileLink.href); break; }
      catch (e) { lastError = e; if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1))); }
    }
    if (!buffer) { await ctx.telegram.sendMessage(msg.chat.id, ` Не удалось скачать (${lastError?.message}).`, { reply_to_message_id: msg.message_id }); return; }
    
    const parsed = await parseDocxArticle(buffer);
    if (!parsed.ok) { await ctx.telegram.sendMessage(msg.chat.id, `❌ ${parsed.error}`, { reply_to_message_id: msg.message_id }); return; }
    
    const isEnglish = detectArticleLanguage(parsed.meta.title) === "en";
    
    const state = {
      parsed, chatId, lastMessageId: msg.message_id, isEnglish,
      isUpdate: null, step: 'ask_type',
      searchResults: [], selectedId: null, originalId: null,
      timer: setTimeout(() => cleanupDocx(chatId), DOCX_TIMEOUT_MS)
    };
    pendingDocx.set(chatId, state);
    
    const kb = { inline_keyboard: [
      [{ text: "🆕 Новая статья", callback_data: "docx_new" }],
      [{ text: "🔄 Обновить существующую", callback_data: "docx_update" }]
    ]};
    
    await ctx.telegram.sendMessage(chatId,
      ` Файл принят: «${parsed.meta.title}»\n🌐 Язык: ${isEnglish ? "EN" : "RU"}\n\nЭто новая статья или обновление?`,
      { reply_markup: JSON.stringify(kb) }
    );
  } catch (e) { console.error("[bot/docx] error:", e); }
}

function registerBotActions(bot) {
  bot.action(/^docx_(new|update)$/, async (ctx) => {
    const chatId = String(ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id);
    const state = pendingDocx.get(chatId);
    if (!state || state.step !== 'ask_type') {
        return ctx.answerCbQuery("️ Сессия не найдена").catch(() => {});
    }

    const action = ctx.match[1];
    state.isUpdate = action === 'update';
    state.step = state.isUpdate ? 'ask_link' : 'processing';
    
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText(`✅ Выбрано: ${state.isUpdate ? "Обновление" : "Новая статья"}\n⏳ Начинаю обработку...`).catch(() => {});

    if (!state.isUpdate) {
      finalizeDocxAction(chatId).catch(console.error);
    } else {
      await ctx.telegram.sendMessage(chatId, "🔍 Введите часть заголовка для поиска:");
    }
  });
}

function handleDocxTextInteraction(ctx) {
  const msg = ctx.message || ctx.channelPost;
  const chatId = String(msg?.chat?.id ?? "");
  const state = pendingDocx.get(chatId);
  if (!state || state.step === 'ask_type' || state.step === 'processing') return false;

  const text = (msg.caption || msg.text || "").trim();
  if (!text) return false;

  if (text === "/cancel" || text === "/skip") { cleanupDocx(chatId, "cancel"); ctx.telegram.sendMessage(chatId, "✅ Отменено."); return true; }

  if (state.step === 'ask_link') {
    strapi.searchArticlesByTitle(text).then(results => {
      if (!results.length) { ctx.telegram.sendMessage(chatId, "❌ Ничего не найдено.", { reply_to_message_id: msg.message_id }); return; }
      state.searchResults = results; state.step = 'select_id';
      ctx.telegram.sendMessage(chatId, `🔍 Найдено:\n${results.map((r,i)=>`${i+1}. ${r.title}`).join("\n")}\n\nОтправьте номер.`, { reply_to_message_id: msg.message_id });
    }).catch(e => ctx.telegram.sendMessage(chatId, `❌ Ошибка поиска: ${e.message}`, { reply_to_message_id: msg.message_id }));
    return true;
  }

  if (state.step === 'select_id') {
    const idx = parseInt(text, 10) - 1;
    if (state.searchResults[idx]) {
      state.selectedId = state.searchResults[idx].documentId || state.searchResults[idx].id;
      state.originalId = state.searchResults[idx].id;
      state.step = 'done';
      finalizeDocxAction(chatId).catch(console.error);
      return true;
    }
    ctx.telegram.sendMessage(chatId, "❌ Неверный номер.", { reply_to_message_id: msg.message_id });
    return true;
  }
  return false;
}

async function routeChannelUpdate(ctx) {
  const msg = ctx.message || ctx.channelPost;
  if (!msg) return;
  if (msg.document) return handleDocumentUpload(ctx);
  return handleChannelPost(ctx);
}

async function handleChannelPost(ctx) {
  const msg = ctx.channelPost || ctx.message || ctx.editedMessage || ctx.editedChannelPost;
  if (!msg) return;
  const chatId = msg.chat?.id;
  if (String(chatId) !== String(CHANNEL_ID)) return;
  
  if (handleDocxTextInteraction(ctx)) return;

  const text = msg.caption || msg.text;
  if (!text?.trim()) {
    const pId = pickPhotoFileId(msg);
    if (pId) { const p = pendingArticles.get(chatId); if (p && !p.photoFileId) { p.photoFileId = pId; p.lastActivityAt = new Date(); resetTimer(chatId); } }
    return;
  }
  const trimmed = text.trim().toLowerCase();
  if (trimmed === "/publish" || trimmed.startsWith("/publish@")) { await finalizePublish(chatId, { reason: "command", replyToMessageId: msg.message_id }); return; }
  if (trimmed === "/cancel" || trimmed.startsWith("/cancel@")) { const p = pendingArticles.get(chatId); if (p?.timer) clearTimeout(p.timer); pendingArticles.delete(chatId); await ctx.telegram.sendMessage(chatId, "✅ Отменено.", { reply_to_message_id: msg.message_id }); return; }
  if (trimmed === "/template" || trimmed.startsWith("/template@")) { await ctx.telegram.sendDocument(chatId, Input.fromLocalFile(path.join(__dirname, "Шаблон_статьи_АНО_Единый_Мир.docx")), { reply_to_message_id: msg.message_id }); return; }
  if (text.trim().startsWith("/")) return;
  
  const pId = pickPhotoFileId(msg);
  const pending = pendingArticles.get(chatId);
  if (!pending) {
    const parsed = parseFirstMessage(text.trim());
    if (!parsed.ok) { await ctx.telegram.sendMessage(chatId, `❌ ${parsed.error}`, { reply_to_message_id: msg.message_id }); return; }
    const record = { title: parsed.title, categorySlug: parsed.categorySlug, regionSlug: parsed.regionSlug, format: parsed.format, authorName: parsed.authorName, excerptOverride: parsed.excerpt || null, bodyParts: [parsed.bodyText], photoFileId: pId || null, timer: null, startedAt: new Date(), lastActivityAt: new Date(), lastMessageId: msg.message_id };
    pendingArticles.set(chatId, record); resetTimer(chatId);
    await ctx.telegram.sendMessage(chatId, `📝 Начал собирать «${record.title}».`, { reply_to_message_id: msg.message_id });
    return;
  }
  pending.bodyParts.push(text.trim()); pending.lastActivityAt = new Date(); pending.lastMessageId = msg.message_id;
  if (!pending.photoFileId && pId) pending.photoFileId = pId;
  resetTimer(chatId);
}

registerBotActions(bot);
bot.on("channel_post", routeChannelUpdate);
bot.on("message", routeChannelUpdate);
bot.on("edited_message", handleChannelPost);
bot.catch(err => console.error("bot error", err));

async function startBot() {
  try { await bot.telegram.deleteWebhook({ drop_pending_updates: true }); } catch (e) {}
  await new Promise(r => setTimeout(r, 3000));
  await bot.launch({ allowedUpdates: ["message", "edited_message", "channel_post", "edited_channel_post", "callback_query"], dropPendingUpdates: true });
  console.log("[boot] Telegram bot running ✅");
}
startBot().catch(e => { console.error("[boot] failed:", e); setTimeout(() => process.exit(1), 1000); });
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));