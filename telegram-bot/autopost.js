const { Input } = require('telegraf');
const axios = require('axios');

function toCleanHashtag(text) {
  if (!text) return "";
  return text.replace(/[-_]/g, " ").trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function formatTelegramPost(article) {
  const { title, author, excerpt, slug, category, region, format } = article;
  const baseUrl = (process.env.SITE_URL || "https://anounitedworld.com").replace(/\/$/, "");
  const articleUrl = `${baseUrl}/articles/${slug}`;

  const tags = [];
  if (format) tags.push(`#${toCleanHashtag(format)}`);
  if (region) tags.push(`#${toCleanHashtag(region)}`);
  if (category) tags.push(`#${toCleanHashtag(category)}`);
  tags.push("#АналитическиестатьиЕМ", "#Единыймир");
  const uniqueTags = [...new Set(tags)].slice(0, 10).join(" ");

  return `Подготовили статью по теме "${title}"

<blockquote>${excerpt || "Читайте полную версию статьи по ссылке ниже."}</blockquote>

Автор: ${author || "Редакция"} ✍️

🔗 <a href="${articleUrl}">Читать статью</a>

${uniqueTags}`.trim();
}

// Проверка: ссылка доступна из интернета?
function isValidPublicUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
           !u.hostname.includes('localhost') &&
           !u.hostname.includes('127.0.0.1') &&
           !u.hostname.includes('strapi') &&
           !u.hostname.includes('192.168.') &&
           !u.hostname.includes('10.');
  } catch { return false; }
}

async function postToTelegram(bot, channelId, article) {
  const caption = formatTelegramPost(article);

  // 1️ Если ссылка публичная — шлём по URL (быстрее)
  if (isValidPublicUrl(article.coverUrl)) {
    try {
      await bot.telegram.sendPhoto(channelId, article.coverUrl, {
        caption, parse_mode: "HTML", disable_web_page_preview: false
      });
      console.log("[autopost] ✅ Telegram: пост с фото опубликован (по URL)");
      return true;
    } catch (e) {
      console.warn(`[autopost] ⚠️ URL не сработал, пробую бинарно: ${e.message}`);
    }
  }

  // 2️⃣ Фоллбэк: скачиваем с localhost/Docker и шлём как бинарный файл
  if (article.coverUrl) {
    try {
      console.log("[autopost] 📥 Скачиваю обложку локально...");
      const res = await axios.get(article.coverUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const buffer = Buffer.from(res.data);
      
      // ✅ Telegraf v4 требует Input.fromBuffer для отправки буфера
      const photo = Input.fromBuffer(buffer, 'cover.jpg');
      
      await bot.telegram.sendPhoto(channelId, photo, {
        caption, parse_mode: "HTML", disable_web_page_preview: false
      });
      console.log("[autopost] ✅ Telegram: пост с фото опубликован (бинарно)");
      return true;
    } catch (e) {
      console.error(`[autopost] ❌ Ошибка загрузки/отправки фото: ${e.message}`);
    }
  }

  // 3️⃣ Финальный фоллбэк на текст
  console.log("[autopost]  Отправляю текстом...");
  await bot.telegram.sendMessage(channelId, caption, {
    parse_mode: "HTML", disable_web_page_preview: false
  });
  return true;
}

async function autoPostToTelegram({ bot, article }) {
  const channelId = process.env.TG_AUTOPOST_CHANNEL_ID;
  if (!channelId || article.isEnglish) {
    console.log(`[autopost] ⏭️ Пропуск TG (канал: ${!!channelId}, язык: ${article.isEnglish ? 'EN' : 'RU'})`);
    return false;
  }
  return await postToTelegram(bot, channelId, article);
}

module.exports = { formatTelegramPost, autoPostToTelegram };