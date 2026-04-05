/**
 * Telegram → Strapi: publish articles from a channel post.
 */

require("dotenv").config();

const { SocksProxyAgent } = require("socks-proxy-agent");
const agent = new SocksProxyAgent("socks5://127.0.0.1:10808");

const { Telegraf } = require("telegraf");
const { parseMessage } = require("./parser");
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

/**
 * @param {import('telegraf').Context} ctx
 */
async function handleChannelPost(ctx) {
  const msg = ctx.channelPost || ctx.message;
  if (!msg) return;

  const chatId = String(msg.chat.id);
  if (chatId !== String(CHANNEL_ID)) {
    console.log(`Skip chat_id=${chatId} (expected ${CHANNEL_ID})`);
    return;
  }

  const text = msg.caption || msg.text;
  if (!text || !String(text).trim()) {
    await replyStatus(
      ctx,
      "❌ Ошибка: нет текста (для фото нужна подпись с шаблоном)",
    );
    return;
  }

  const parsed = parseMessage(text);
  if (!parsed.ok) {
    await replyStatus(ctx, `❌ Ошибка: ${parsed.error}`);
    return;
  }

  let coverBuffer = null;
  let coverName = "cover.jpg";
  if (msg.photo && msg.photo.length) {
    const p = msg.photo[msg.photo.length - 1];
    try {
      const link = await ctx.telegram.getFileLink(p.file_id);
      const res = await fetch(link.href);
      if (!res.ok) throw new Error(`Download ${res.status}`);
      coverBuffer = Buffer.from(await res.arrayBuffer());
      const path = link.pathname || "";
      const ext = path.includes(".") ? path.split(".").pop() : "jpg";
      if (ext && /^[a-z0-9]+$/i.test(ext)) {
        coverName = `cover.${ext}`;
      }
    } catch (e) {
      console.error("Photo download failed:", e);
    }
  }

  try {
    let categoryId = null;
    let regionId = null;

    if (parsed.categorySlug) {
      const c = await strapi.findCategoryBySlug(parsed.categorySlug);
      if (c) {
        categoryId = c.id;
      } else {
        console.warn(
          `Category not found for slug="${parsed.categorySlug}", publishing without category`,
        );
      }
    }

    if (parsed.regionSlug) {
      const r = await strapi.findRegionBySlug(parsed.regionSlug);
      if (r) {
        regionId = r.id;
      } else {
        console.warn(
          `Region not found for slug="${parsed.regionSlug}", publishing without region`,
        );
      }
    }

    const authorId = parsed.authorName
      ? await ensureAuthorId(parsed.authorName)
      : null;

    const contentBlocks = strapi.markdownToBlocks(parsed.bodyMarkdown);
    const readingTime = readingTimeMinutes(parsed.bodyMarkdown);

    let excerpt = "";
    const firstPara = contentBlocks.find((b) => b.type === "paragraph");
    if (firstPara?.children?.length) {
      excerpt = firstPara.children
        .map((ch) => ch.text || "")
        .join("")
        .slice(0, 280);
    }

    let coverImageId = null;
    if (coverBuffer) {
      try {
        coverImageId = await strapi.uploadImage(coverBuffer, coverName);
      } catch (e) {
        console.error("Upload cover failed:", e);
      }
    }

    const result = await createArticleWithUniqueSlug(parsed.title, async (slug) =>
      strapi.createArticle({
        title: parsed.title,
        slug,
        contentBlocks,
        excerpt,
        format: parsed.format || "анализ",
        authorId,
        categoryId,
        regionId,
        coverImageId,
        readingTime,
      }),
    );

    const url = articleUrl(result.slug);
    await replyStatus(ctx, `✅ Опубликовано: ${url}`);
  } catch (e) {
    console.error(e);
    const desc = e.message || String(e);
    await replyStatus(ctx, `❌ Ошибка: ${desc}`);
  }
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

const bot = new Telegraf(BOT_TOKEN, {
  telegram: { agent },
});

bot.on("channel_post", handleChannelPost);

bot.catch((err, ctx) => {
  console.error("bot error", err);
});

bot
  .launch()
  .then(() => {
    console.log("Telegram bot running. Listening for channel_post…");
    console.log(`CHANNEL_ID=${CHANNEL_ID}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
