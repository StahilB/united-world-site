const axios = require('axios');
const FormData = require('form-data');

function toCleanHashtagEN(text) {
  if (!text) return "";
  return text.replace(/[-_]/g, " ").trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function formatFacebookPost(article) {
  const { title, author, excerpt, slug, category, region, format } = article;
  const baseUrl = (process.env.SITE_URL_EN || "https://en.anounitedworld.com").replace(/\/$/, "");
  const articleUrl = `${baseUrl}/articles/${slug}`;

  const tags = [];
  if (format) tags.push(`#${toCleanHashtagEN(format)}`);
  if (region) tags.push(`#${toCleanHashtagEN(region)}`);
  if (category) tags.push(`#${toCleanHashtagEN(category)}`);
  tags.push("#AnalyticalArticles", "#UnitedWorld");
  return `📰 ${title}\n\n"${excerpt || "Read the full article via the link below."}"\n\nAuthor: ${author || "Editorial"} ✍️\n\n🔗 Read full article: ${articleUrl}\n\n${tags.join(" ")}`.trim();
}

async function autoPostToFacebook({ article }) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const targetId = process.env.FB_TARGET_ID;
  const WORKER_URL = process.env.FB_WORKER_URL; // Ссылка из Шага 1
  const WORKER_TOKEN = process.env.FB_WORKER_TOKEN; // Твой ключ из Шага 1
  
  if (!token || !targetId || !WORKER_URL || !WORKER_TOKEN) { 
    console.log('[autopost-fb] ⏭️ Нет настроек FB/Worker'); 
    return false; 
  }
  if (!article.isEnglish) { console.log('[autopost-fb] ⏭️ Не на английском'); return false; }
  if (!article.coverUrl) { console.log('[autopost-fb] ⚠️ Нет обложки'); return false; }

  const text = formatFacebookPost(article);
  const fbApiUrl = `https://graph.facebook.com/v21.0/${targetId}/photos?access_token=${encodeURIComponent(token)}`;

  try {
    console.log('[autopost-fb] 📤 Отправляю через Cloudflare Worker...');
    const imgRes = await axios.get(article.coverUrl, { responseType: 'arraybuffer', timeout: 10000 });
    
    const formData = new FormData();
    formData.append('message', text);
    formData.append('published', 'true');
    formData.append('source', imgRes.data, { filename: 'cover.jpg' });

    const response = await axios.post(WORKER_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Target-Url': fbApiUrl,
        'X-Proxy-Token': WORKER_TOKEN
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.status >= 200 && response.status < 300) {
      console.log('[autopost-fb] ✅ Facebook: опубликовано');
      return true;
    } else {
      console.error(`[autopost-fb] ❌ FB API ${response.status}:`, JSON.stringify(response.data).slice(0, 200));
      return false;
    }
  } catch (e) {
    console.error(`[autopost-fb] ❌ Ошибка: ${e.message}`);
    return false;
  }
}

module.exports = { autoPostToFacebook };