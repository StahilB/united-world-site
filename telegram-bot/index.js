/**
 * Telegram → Strapi: publish articles from a channel post.
 */

require("dotenv").config();

console.log("[boot] telegram-bot starting...");

const { Telegraf } = require("telegraf");
const {
  parseFirstMessage,
  telegramToHtml,
  resolveCategorySlug,
  resolveRegionSlug,
} = require("./parser");
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
    return null;
  }
  const p = msg.photo[msg.photo.length - 1];
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
  const link = await bot.telegram.getFileLink(fileId);
  const res = await fetch(link.href);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const p = link.pathname || "";
  const ext = p.includes(".") ? p.split(".").pop() : "jpg";
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

    let coverImageId = null;
    if (pending.photoFileId) {
      try {
        const { buffer, filename } = await downloadTelegramPhoto(
          bot,
          pending.photoFileId,
        );
        if (buffer) {
          coverImageId = await strapi.uploadImage(buffer, filename || "cover.jpg");
        }
      } catch (e) {
        console.error("Upload cover failed:", e);
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
    "Команды: /publish /cancel /status /recent",
  ].join("\n");
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
    // Continuation messages must have text; photos without caption are ignored.
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

  // Ignore unknown commands so they don't enter article body
  if (trimmed.startsWith("/")) {
    console.log(`[handle] ignoring unknown command: ${trimmed}`);
    return;
  }

  const photoFileId = pickPhotoFileId(msg);
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
      bodyParts: [parsed.bodyText],
      photoFileId: photoFileId || null,
      timer: null,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      lastMessageId: msg.message_id,
    };
    pendingArticles.set(chatId, record);
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

// Events in channel posts
bot.on("channel_post", (ctx) => {
  console.log(`[event] channel_post from chat ${ctx.chat?.id}`);
  return handleChannelPost(ctx);
});

// Events in group/supergroup/private chats
bot.on("message", (ctx) => {
  console.log(
    `[event] message from chat ${ctx.chat?.id} (type=${ctx.chat?.type})`,
  );
  return handleChannelPost(ctx);
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
