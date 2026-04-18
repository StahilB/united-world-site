/**
 * Telegram → Strapi: publish articles from a channel post.
 */

require("dotenv").config();

console.log("[boot] telegram-bot starting...");

const path = require("path");
const fs = require("fs");
const { Telegraf, Input } = require("telegraf");
const {
  parseFirstMessage,
  telegramToHtml,
  resolveCategorySlug,
  resolveRegionSlug,
  normalizeFormatSlug,
} = require("./parser");
const { parseDocxArticle } = require("./docx-parser");
const { createStrapiClient } = require("./strapi-client");
const { slugFromTitle, readingTimeMinutes } = require("./utils");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

const BOT_TOKEN = requireEnv("BOT_TOKEN");
const CHANNEL_ID = requireEnv("CHANNEL_ID");
const STRAPI_URL = requireEnv("STRAPI_URL");
const STRAPI_TOKEN = requireEnv("STRAPI_TOKEN");
const STRAPI_PUBLIC_URL = (
  process.env.STRAPI_PUBLIC_URL || STRAPI_URL
).replace(/\/$/, "");
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

const strapi = createStrapiClient({
  baseUrl: STRAPI_URL,
  token: STRAPI_TOKEN,
});

const pendingArticles = new Map();
const PUBLISH_AFTER_MS = 5 * 60 * 1000;

function siteBase() {
  return SITE_URL.replace(/\/$/, "");
}

function articleUrl(slug) {
  return `${siteBase()}/articles/${slug}`;
}

/**
 * @param {string} name
 * @returns {Promise<number | null>}
 */
async function ensureAuthorId(name) {
  if (!name || !name.trim()) {
    return null;
  }
  const found = await strapi.findAuthorByName(name);
  if (found) {
    return found.id;
  }
  let base = slugFromTitle(name);
  if (!base) base = "author";
  for (let i = 0; i < 5; i += 1) {
    const slug = i === 0 ? base : `${base}-${Date.now()}`;
    try {
      const created = await strapi.createAuthor(name.trim(), slug);
      if (created?.id) {
        console.log(`Created author id=${created.id} slug=${slug}`);
        return created.id;
      }
    } catch (e) {
      if (e.status === 400 && i < 4) {
        continue;
      }
      throw e;
    }
  }
  return null;
}

/**
 * @param {string} title
 * @param {() => Promise<{ id: number; slug: string }>} createFn
 */
async function createArticleWithUniqueSlug(title, createFn) {
  const base = slugFromTitle(title);
  let attempt = 0;
  let lastErr = null;
  while (attempt < 8) {
    const slug =
      attempt === 0 ? base : `${base}-${Date.now().toString(36)}-${attempt}`;
    try {
      return await createFn(slug);
    } catch (e) {
      lastErr = e;
      const msg = String(e.message || "");
      if (
        msg.includes("unique") ||
        msg.includes("slug") ||
        e.status === 400
      ) {
        attempt += 1;
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Could not allocate unique slug");
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, "");
}

function pickPhotoFileId(msg) {
  if (!msg?.photo || !Array.isArray(msg.photo) || msg.photo.length === 0) {
    console.log("[photo] no photo array in msg");
    return null;
  }
  const p = msg.photo[msg.photo.length - 1];
  console.log(
    `[photo] found ${msg.photo.length} sizes, picked file_id=${p?.file_id?.slice(0, 30)}...`,
  );
  return p?.file_id || null;
}

function resetTimer(chatId) {
  const p = pendingArticles.get(chatId);
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    finalizePublish(chatId, { reason: "timeout" }).catch((e) => {
      console.error("auto publish failed:", e);
    });
  }, PUBLISH_AFTER_MS);
}

async function downloadTelegramPhoto(bot, fileId) {
  if (!fileId) return { buffer: null, filename: null };
  console.log(`[download] getFileLink for ${fileId.slice(0, 30)}...`);
  const link = await bot.telegram.getFileLink(fileId);
  console.log(`[download] file URL: ${link.href}`);
  const res = await fetch(link.href);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} from ${link.href}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`[download] got ${buffer.length} bytes`);
  const p = link.pathname || link.href;
  const ext = p.includes(".") ? p.split(".").pop().split("?")[0] : "jpg";
  const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
  return { buffer, filename: `cover.${safeExt}` };
}

async function finalizePublish(chatId, { reason, replyToMessageId } = {}) {
  const pending = pendingArticles.get(chatId);
  if (!pending) {
    if (replyToMessageId) {
      await bot.telegram.sendMessage(chatId, "ℹ️ Нет незаконченной статьи.", {
        reply_to_message_id: replyToMessageId,
      });
    }
    return;
  }

  // Stop timer and remove first, so we don't double-publish.
  if (pending.timer) clearTimeout(pending.timer);
  pendingArticles.delete(chatId);

  try {
    const bodyText = pending.bodyParts.join("\n\n").trim();
    const htmlBody = telegramToHtml(bodyText);
    const plainText = stripHtml(htmlBody);
    const excerpt =
      pending.excerptOverride ||
      plainText.replace(/\s+/g, " ").trim().slice(0, 280);
    const readingTime = readingTimeMinutes(plainText);

    let categoryId = null;
    let regionId = null;

    if (pending.categorySlug) {
      const c = await strapi.findCategoryBySlug(pending.categorySlug);
      if (c) categoryId = c.id;
      else {
        console.warn(
          `Category not found for slug="${pending.categorySlug}", publishing without category`,
        );
      }
    }

    if (pending.regionSlug) {
      const r = await strapi.findRegionBySlug(pending.regionSlug);
      if (r) regionId = r.id;
      else {
        console.warn(
          `Region not found for slug="${pending.regionSlug}", publishing without region`,
        );
      }
    }

    const authorId = pending.authorName
      ? await ensureAuthorId(pending.authorName)
      : null;

    console.log(
      `[publish] photoFileId=${pending.photoFileId ? `${pending.photoFileId.slice(0, 30)}...` : "null"}`,
    );
    let coverImageId = null;
    if (pending.photoFileId) {
      try {
        console.log("[publish] downloading photo from Telegram...");
        const { buffer, filename } = await downloadTelegramPhoto(
          bot,
          pending.photoFileId,
        );
        console.log(
          `[publish] downloaded: buffer=${buffer?.length || 0} bytes, filename=${filename}`,
        );
        if (buffer) {
          console.log("[publish] uploading to Strapi...");
          coverImageId = await strapi.uploadImage(buffer, filename || "cover.jpg");
          console.log(`[publish] uploaded: coverImageId=${coverImageId}`);
        }
      } catch (e) {
        console.error("[publish] Upload cover failed:", e?.message || e);
        console.error(e?.stack || "");
      }
    }

    const result = await createArticleWithUniqueSlug(pending.title, async (slug) =>
      strapi.createArticle({
        title: pending.title,
        slug,
        htmlBody,
        excerpt,
        format: pending.format || "анализ",
        publicationDate: new Date().toISOString(),
        readingTime,
        authorId,
        categoryId,
        regionId,
        coverImageId,
      }),
    );

    const url = articleUrl(result.slug);
    const note =
      reason === "timeout"
        ? `✅ Опубликовано (авто): ${url}`
        : `✅ Опубликовано: ${url}`;
    const replyId = replyToMessageId || pending.lastMessageId;
    await bot.telegram.sendMessage(chatId, note, {
      reply_to_message_id: replyId,
      disable_web_page_preview: false,
    });
  } catch (e) {
    console.error(e);
    const desc = e.message || String(e);
    const replyId = replyToMessageId || pending.lastMessageId;
    await bot.telegram.sendMessage(chatId, `❌ Ошибка: ${desc}`, {
      reply_to_message_id: replyId,
    });
  }
}

function formatHelpText() {
  return [
    "Шаблон первого сообщения статьи:",
    "",
    "Заголовок статьи",
    "#категория #регион #формат",
    "Автор: Имя Фамилия",
    "",
    "Первый абзац текста…",
    "",
    "Дальше можно слать продолжение отдельными сообщениями.",
    "Команды: /publish /cancel /status /recent /template",
    "Или отправьте .docx по шаблону (/template).",
  ].join("\n");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function sendTemplateDocument(ctx) {
  try {
    const msg = ctx.message || ctx.channelPost;
    if (!msg?.chat?.id) return;
    const templatePath = path.join(
      __dirname,
      "Шаблон_статьи_АНО_Единый_Мир.docx",
    );
    if (!fs.existsSync(templatePath)) {
      await ctx.telegram.sendMessage(
        msg.chat.id,
        "❌ Файл шаблона не найден на сервере.",
        { reply_to_message_id: msg.message_id },
      );
      return;
    }
    await ctx.telegram.sendDocument(msg.chat.id, Input.fromLocalFile(templatePath), {
      reply_to_message_id: msg.message_id,
      caption:
        "Скачайте этот шаблон, заполните поля и отправьте заполненный .docx боту. Изображения вставляйте прямо в текст — первое по порядку станет обложкой.",
    });
  } catch (e) {
    console.error("[bot/template] error:", e);
    const msg = ctx.message || ctx.channelPost;
    if (msg?.chat?.id) {
      await ctx.telegram.sendMessage(
        msg.chat.id,
        "❌ Не удалось отправить шаблон.",
        { reply_to_message_id: msg.message_id },
      );
    }
  }
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function handleDocumentUpload(ctx) {
  try {
    const msg = ctx.message || ctx.channelPost;
    const chatId = String(msg?.chat?.id ?? "");
    if (chatId !== String(CHANNEL_ID)) {
      console.log(`[docx] skip wrong chat ${chatId}`);
      return;
    }

    const doc = msg.document;
    if (!doc) return;

    const mime = doc.mime_type || "";
    const fname = doc.file_name || "";
    const isDocx =
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fname.toLowerCase().endsWith(".docx");

    if (!isDocx) {
      await ctx.telegram.sendMessage(msg.chat.id, "❌ Я понимаю только файлы .docx по стандартному шаблону. Получите шаблон через /template.", {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    if (doc.file_size && doc.file_size > 20 * 1024 * 1024) {
      await ctx.telegram.sendMessage(msg.chat.id, "❌ Файл слишком большой (>20 МБ).", {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    await ctx.telegram.sendMessage(msg.chat.id, "📥 Получил файл, разбираю...", {
      reply_to_message_id: msg.message_id,
    });

    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const res = await fetch(fileLink.href);
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const parsed = await parseDocxArticle(buffer);
    if (!parsed.ok) {
      await ctx.telegram.sendMessage(msg.chat.id, `❌ ${parsed.error}`, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    const { meta, bodyHtml, images, warnings } = parsed;

    if (warnings && warnings.length > 0) {
      console.warn("[docx] mammoth warnings:", warnings);
    }

    const categorySlug = meta.category
      ? resolveCategorySlug(meta.category)
      : null;
    const regionSlug = meta.region
      ? resolveRegionSlug(meta.region.replace(/\s+/g, "_"))
      : null;
    const format = meta.format ? normalizeFormatSlug(meta.format) : null;

    if (meta.format && !format) {
      await ctx.telegram.sendMessage(
        msg.chat.id,
        `❌ Неизвестный формат «${meta.format}». Допустимо: анализ, мнение, интервью, колонка, обзор.`,
        { reply_to_message_id: msg.message_id },
      );
      return;
    }

    let coverImageId = null;
    let bodyHtmlFinal = bodyHtml;

    for (const img of images) {
      const mimePart = (img.contentType || "image/png").split("/")[1] || "png";
      const ext = mimePart.replace(/[^a-z0-9]/gi, "") || "png";
      const filename = `article-img-${Date.now()}-${img.index}.${ext}`;
      const uploaded = await strapi.uploadMedia(
        img.buffer,
        filename,
        img.contentType || "image/png",
      );
      if (!uploaded) {
        console.warn(`[docx] image #${img.index} upload failed, skipping`);
        const ph = escapeRegExp(`__IMG_PLACEHOLDER_${img.index}__`);
        bodyHtmlFinal = bodyHtmlFinal.replace(
          new RegExp(`<img[^>]*src=["']?${ph}["']?[^>]*>`, "gi"),
          "",
        );
        continue;
      }
      if (img.index === 0) {
        coverImageId = uploaded.id;
        const ph = escapeRegExp(`__IMG_PLACEHOLDER_${img.index}__`);
        bodyHtmlFinal = bodyHtmlFinal.replace(
          new RegExp(`<img[^>]*src=["']?${ph}["']?[^>]*>`, "gi"),
          "",
        );
      } else {
        const imgUrl = uploaded.url.startsWith("http")
          ? uploaded.url
          : `${STRAPI_PUBLIC_URL}${uploaded.url}`;
        const ph = escapeRegExp(`__IMG_PLACEHOLDER_${img.index}__`);
        bodyHtmlFinal = bodyHtmlFinal.replace(
          new RegExp(ph, "g"),
          imgUrl,
        );
      }
    }

    const authorId = meta.author ? await ensureAuthorId(meta.author) : null;

    let categoryId = null;
    if (categorySlug) {
      const c = await strapi.findCategoryBySlug(categorySlug);
      if (c) categoryId = c.id;
    }

    let regionId = null;
    if (regionSlug) {
      const r = await strapi.findRegionBySlug(regionSlug);
      if (r) regionId = r.id;
    }

    const plainText = bodyHtmlFinal.replace(/<[^>]+>/g, " ").trim();
    const readingTime = readingTimeMinutes(plainText);

    const result = await createArticleWithUniqueSlug(meta.title, async (slug) =>
      strapi.createArticle({
        title: meta.title,
        slug,
        htmlBody: bodyHtmlFinal,
        excerpt: meta.excerpt,
        format: format || "анализ",
        authorId,
        categoryId,
        regionId,
        coverImageId,
        readingTime,
        publicationDate: new Date().toISOString(),
      }),
    );

    if (!result) {
      await ctx.telegram.sendMessage(msg.chat.id, "❌ Не удалось создать статью в Strapi.", {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    const url = articleUrl(result.slug);
    await ctx.telegram.sendMessage(
      msg.chat.id,
      `✅ Статья опубликована!\n\n` +
        `📰 ${meta.title}\n` +
        `🔗 ${url}\n\n` +
        `Картинок: ${images.length} (${coverImageId ? "обложка есть" : "без обложки"})`,
      { reply_to_message_id: msg.message_id, disable_web_page_preview: false },
    );
  } catch (e) {
    console.error("[bot/docx] error:", e);
    const msg = ctx.message || ctx.channelPost;
    if (msg?.chat?.id) {
      await ctx.telegram.sendMessage(
        msg.chat.id,
        `❌ Ошибка обработки: ${e.message || String(e)}`,
        { reply_to_message_id: msg.message_id },
      );
    }
  }
}

/**
 * Маршрут: документы → docx, иначе текст статьи.
 * @param {import('telegraf').Context} ctx
 */
async function routeChannelUpdate(ctx) {
  const msg = ctx.message || ctx.channelPost;
  if (!msg) return;
  if (msg.document) {
    return handleDocumentUpload(ctx);
  }
  return handleChannelPost(ctx);
}

/**
 * @param {import('telegraf').Context} ctx
 */
async function handleChannelPost(ctx) {
  const msg =
    ctx.channelPost || ctx.message || ctx.editedMessage || ctx.editedChannelPost;
  if (!msg) {
    console.log("[handle] no message in ctx, skip");
    return;
  }

  const chat = msg.chat || ctx.chat;
  const chatId = chat?.id;
  const chatType = chat?.type;
  const rawText = msg.caption || msg.text || "";
  const textPreview = String(rawText).slice(0, 200);
  const match = String(chatId) === String(CHANNEL_ID);

  console.log(
    `[handle] updateType=${ctx.updateType} chatId=${chatId} chatType=${chatType} match=${match} text=${JSON.stringify(textPreview)}`,
  );

  if (!match) {
    console.log(
      `[handle] SKIP — wrong chat (got ${chatId}, expected ${CHANNEL_ID})`,
    );
    return;
  }

  const text = msg.caption || msg.text;
  if (!text || !String(text).trim()) {
    const photoOnly = pickPhotoFileId(msg);
    if (photoOnly) {
      const pendingPhoto = pendingArticles.get(chatId);
      if (pendingPhoto && !pendingPhoto.photoFileId) {
        pendingPhoto.photoFileId = photoOnly;
        pendingPhoto.lastActivityAt = new Date();
        resetTimer(chatId);
        console.log("[handle] saved photo-only message to pending");
      } else {
        console.log("[handle] photo-only but no pending article, ignoring");
      }
    }
    return;
  }

  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();

  // Commands
  if (lower === "/publish" || lower.startsWith("/publish@")) {
    await finalizePublish(chatId, { reason: "command", replyToMessageId: msg.message_id });
    return;
  }
  if (lower === "/cancel" || lower.startsWith("/cancel@")) {
    const p = pendingArticles.get(chatId);
    if (p?.timer) clearTimeout(p.timer);
    pendingArticles.delete(chatId);
    await replyStatus(ctx, "✅ Отменено. Буфер очищен.");
    return;
  }
  if (lower === "/status" || lower.startsWith("/status@")) {
    const p = pendingArticles.get(chatId);
    if (!p) {
      await replyStatus(ctx, "ℹ️ Нет незаконченной статьи.");
      return;
    }
    const chars = p.bodyParts.join("\n\n").length;
    const hasPhoto = p.photoFileId ? "да" : "нет";
    const mins = Math.max(
      0,
      Math.ceil((PUBLISH_AFTER_MS - (Date.now() - p.lastActivityAt.getTime())) / 60000),
    );
    await replyStatus(
      ctx,
      `📝 В работе: «${p.title}»\nСимволов: ${chars}\nФото: ${hasPhoto}\nАвтопубликация: ~${mins} мин`,
    );
    return;
  }
  if (lower === "/format" || lower.startsWith("/format@")) {
    await replyStatus(ctx, formatHelpText());
    return;
  }
  if (lower === "/recent" || lower.startsWith("/recent@")) {
    try {
      const items = await strapi.getRecentArticles(5);
      if (!items.length) {
        await replyStatus(ctx, "ℹ️ Недавних статей не найдено.");
        return;
      }
      const lines = items.map((x, i) => `${i + 1}. ${x.title} — ${articleUrl(x.slug)}`);
      await replyStatus(ctx, ["📰 Последние статьи:", ...lines].join("\n"));
    } catch (e) {
      await replyStatus(ctx, `❌ Ошибка: ${e.message || String(e)}`);
    }
    return;
  }
  if (lower === "/template" || lower.startsWith("/template@")) {
    await sendTemplateDocument(ctx);
    return;
  }

  // Ignore unknown commands so they don't enter article body
  if (trimmed.startsWith("/")) {
    console.log(`[handle] ignoring unknown command: ${trimmed}`);
    return;
  }

  const photoFileId = pickPhotoFileId(msg);
  console.log(
    `[handle] photoFileId=${photoFileId ? `${photoFileId.slice(0, 30)}...` : "null"}, hasCaption=${!!msg.caption}, hasText=${!!msg.text}`,
  );
  const pending = pendingArticles.get(chatId);

  if (!pending) {
    const parsed = parseFirstMessage(trimmed);
    if (!parsed.ok) {
      await replyStatus(ctx, `❌ Ошибка: ${parsed.error}\n\n${formatHelpText()}`);
      return;
    }

    const record = {
      title: parsed.title,
      categorySlug: resolveCategorySlug(parsed.categorySlug),
      regionSlug: resolveRegionSlug(parsed.regionSlug),
      format: parsed.format,
      authorName: parsed.authorName,
      excerptOverride: parsed.excerpt || null,
      bodyParts: [parsed.bodyText],
      photoFileId: photoFileId || null,
      timer: null,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      lastMessageId: msg.message_id,
    };
    pendingArticles.set(chatId, record);
    console.log(
      `[handle] new article "${record.title}", photoFileId=${record.photoFileId ? "yes" : "null"}`,
    );
    resetTimer(chatId);
    await replyStatus(
      ctx,
      `📝 Начал собирать статью «${record.title}». Отправляйте продолжение или /publish для публикации.`,
    );
    return;
  }

  // Continuation
  pending.bodyParts.push(trimmed);
  pending.lastActivityAt = new Date();
  pending.lastMessageId = msg.message_id;
  if (!pending.photoFileId && photoFileId) {
    pending.photoFileId = photoFileId;
  }
  resetTimer(chatId);
}

async function replyStatus(ctx, messageText) {
  const msg = ctx.channelPost || ctx.message;
  if (!msg?.chat?.id) return;
  try {
    await ctx.telegram.sendMessage(msg.chat.id, messageText, {
      reply_to_message_id: msg.message_id,
      disable_web_page_preview: false,
    });
  } catch (e) {
    console.error("reply failed:", e);
    try {
      await ctx.telegram.sendMessage(msg.chat.id, messageText);
    } catch (e2) {
      console.error("sendMessage failed:", e2);
    }
  }
}

const proxyUrl = process.env.TELEGRAM_PROXY_URL || "";
const telegramOpts = {};
if (proxyUrl) {
  const { SocksProxyAgent } = require("socks-proxy-agent");
  telegramOpts.agent = new SocksProxyAgent(proxyUrl);
  console.log(`Using Telegram proxy: ${proxyUrl}`);
}

const bot = new Telegraf(BOT_TOKEN, {
  telegram: telegramOpts,
});

// Events in channel posts (документы → docx, иначе текст статьи)
bot.on("channel_post", (ctx) => {
  console.log(`[event] channel_post from chat ${ctx.chat?.id}`);
  return routeChannelUpdate(ctx);
});

// Events in group/supergroup/private chats
bot.on("message", (ctx) => {
  console.log(
    `[event] message from chat ${ctx.chat?.id} (type=${ctx.chat?.type})`,
  );
  return routeChannelUpdate(ctx);
});

// Also listen to edits
bot.on("edited_message", (ctx) => {
  console.log(`[event] edited_message from chat ${ctx.chat?.id}`);
  return handleChannelPost(ctx);
});

bot.catch((err, ctx) => {
  console.error("bot error", err);
});

async function startBot() {
  console.log(
    `[boot] about to launch, BOT_TOKEN=${BOT_TOKEN.slice(0, 10)}..., CHANNEL_ID=${CHANNEL_ID}`,
  );

  // Clear webhook / pending updates before start
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log("[boot] webhook cleared");
  } catch (e) {
    console.error("[boot] deleteWebhook failed (non-fatal):", e?.message || e);
  }

  // Small pause for Telegram to release previous getUpdates session
  await new Promise((r) => setTimeout(r, 3000));

  await bot.launch({
    allowedUpdates: [
      "message",
      "edited_message",
      "channel_post",
      "edited_channel_post",
    ],
    dropPendingUpdates: true,
  });

  console.log("[boot] Telegram bot running ✅");
  console.log(`[boot] Listening for chat_id=${CHANNEL_ID}`);
}

startBot().catch((e) => {
  console.error("[boot] launch failed:", e?.message || e);
  console.error(e?.stack || "");
  setTimeout(() => process.exit(1), 1000);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
