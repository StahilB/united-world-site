/**
 * Strapi REST API client.
 * Production version: Includes smart author search (Cyrillic/Latin/Fuzzy) and Update methods.
 */
const http = require("http");
const https = require("https");
const FormData = require("form-data");
const { marked } = require("marked");

// ─────────────────────────────────────────────────────────────
// УТИЛИТЫ ДЛЯ АВТОРОВ (авто-резолвер)
// ─────────────────────────────────────────────────────────────
const CYR_TO_LAT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z',
  и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r',
  с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh',
  щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
};

function normalize(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ").replace(/ё/g, "е").replace(/[.,;:!?()]/g, "").trim();
}

function toLatin(str) {
  return normalize(str).split("").map(c => CYR_TO_LAT[c] || c).join("");
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (a[i-1]===b[j-1] ? 0 : 1));
  }
  return dp[m][n];
}

// ─────────────────────────────────────────────────────────────
// MAIN CLIENT
// ─────────────────────────────────────────────────────────────
function createStrapiClient({ baseUrl, token }) {
  const origin = baseUrl.replace(/\/+$/, "");
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  const revalidateSecret = process.env.REVALIDATE_SECRET || "";

  async function fetchJson(path, options = {}) {
    const url = path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : "/" + path}`;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!res.ok) {
      const msg = json?.error?.message || text || res.statusText;
      const err = new Error(`Strapi ${res.status}: ${msg}`);
      err.status = res.status; err.body = text; throw err;
    }
    return json;
  }

  async function findCategoryBySlug(slug) {
    if (!slug) return null;
    const data = await fetchJson(`/api/categories?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1`);
    return data?.data?.[0] ? { id: data.data[0].id } : null;
  }

  async function findRegionBySlug(slug) {
    if (!slug) return null;
    const data = await fetchJson(`/api/regions?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1`);
    return data?.data?.[0] ? { id: data.data[0].id } : null;
  }

  // 🔍 УМНЫЙ ПОИСК/СОЗДАНИЕ АВТОРА
  async function findAuthorByName(name) {
    if (!name?.trim()) return null;
    
    const inputNorm = normalize(name);
    const inputLatin = toLatin(name);
    
    // 1. Грузим всех авторов
    const data = await fetchJson(`/api/authors?pagination[pageSize]=100&fields[0]=name&fields[1]=id`);
    const rows = data?.data || [];
    
    // 2. Точное совпадение
    const exact = rows.find(r => normalize(r.name) === inputNorm);
    if (exact) return { id: exact.id };
    
    // 3. Совпадение через транслит (кириллица ↔ латиница)
    const translitMatch = rows.find(r => toLatin(r.name) === inputLatin);
    if (translitMatch) return { id: translitMatch.id };
    
    // 4. Fuzzy-поиск по Левенштейну (расстояние ≤ 3)
    let best = null, bestDist = 999;
    for (const r of rows) {
      const dist = levenshtein(inputLatin, toLatin(r.name));
      if (dist < bestDist && dist <= 3) { bestDist = dist; best = r; }
    }
    if (best) {
      console.log(`[author] Auto-match: "${name}" → "${best.name}" (dist: ${bestDist})`);
      return { id: best.id };
    }
    return null;
  }

  async function createAuthor(name, slug) {
    const cleanName = name.trim();
    const cleanSlug = slug || cleanName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-zа-яё0-9-]/gi, "");
    console.log(`[author] Creating new: "${cleanName}" (slug: ${cleanSlug})`);
    const data = await fetchJson("/api/authors", { method: "POST", body: JSON.stringify({ data: { name: cleanName, slug: cleanSlug } }) });
    return data?.data?.id ? { id: data.data.id } : null;
  }

  async function uploadMedia(buffer, filename, contentType) {
    const form = new FormData();
    form.append("files", buffer, { filename, contentType: contentType || "application/octet-stream", knownLength: buffer.length });
    const url = `${origin}/api/upload`;
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
      const req = lib.request({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), path: parsed.pathname + parsed.search, method: "POST", headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() } }, (res) => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => {
          if (res.statusCode >= 400) { resolve(null); return; }
          try { const j = JSON.parse(d); const f = Array.isArray(j) ? j[0] : j?.[0]; resolve(f?.id ? { id: f.id, url: f.url || "" } : null); }
          catch { reject(new Error(`Upload parse error: ${d.slice(0,200)}`)); }
        });
      });
      req.on("error", reject); form.pipe(req);
    });
  }
  
  async function uploadImage(buffer, filename) {
    const ext = (filename || "").split(".").pop()?.toLowerCase() || "jpg";
    const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };
    const up = await uploadMedia(buffer, filename || "cover.jpg", mime[ext] || "image/jpeg");
    return up?.id ?? null;
  }

  // 🔍 ПОИСК СТАТЕЙ (возвращает documentId для Strapi v5)
  async function searchArticlesByTitle(query) {
    if (!query?.trim()) return [];
    const q = new URLSearchParams();
    q.set("filters[title][$containsi]", query.trim());
    q.set("pagination[pageSize]", "10");
    q.set("fields[0]", "id"); q.set("fields[1]", "title"); q.set("fields[2]", "slug"); q.set("fields[3]", "documentId");
    const data = await fetchJson(`/api/articles?${q.toString()}`);
    return (data?.data || []).map(x => ({ id: x.id, documentId: x.documentId || String(x.id), title: x.title, slug: x.slug }));
  }

  // 🔄 ОБНОВЛЕНИЕ (использует documentId)
  async function updateArticle(documentId, data) {
    console.log(`[strapi] UPDATE article documentId=${documentId}`);
    const res = await fetchJson(`/api/articles/${documentId}`, { method: "PUT", body: JSON.stringify({ data }) });
    if (!res?.data?.id) throw new Error("Strapi не вернул обновленную статью");
    return { id: res.data.id, slug: res.data.slug };
  }

  async function createArticle(params) {
    const { title, slug, htmlBody, excerpt, format, authorId, categoryId, regionId, coverImageId, readingTime, publicationDate, isEnglish } = params;
    const data = {
      title: title || (isEnglish ? "Draft EN" : "Черновик"), slug, format: format || "анализ",
      reading_time: readingTime, publication_date: publicationDate || new Date().toISOString()
    };
    if (isEnglish) {
      data.title_en = title; data.excerpt_en = excerpt || ""; data.content_html_en = htmlBody; data.is_translated_en = true;
    } else {
      data.excerpt = excerpt || ""; data.content_html = htmlBody;
    }
    if (authorId != null) data.author = authorId;
    if (categoryId != null) data.categories = [categoryId];
    if (regionId != null) data.region = regionId;
    if (coverImageId != null) data.cover_image = coverImageId;

    const res = await fetchJson("/api/articles", { method: "POST", body: JSON.stringify({ data }) });
    if (!res?.data?.id) throw new Error("Strapi не вернул созданную статью");
    
    const created = { id: res.data.id, slug: res.data.slug || slug };

    // Revalidate Next.js cache
    if (siteUrl && revalidateSecret) {
      try {
        await fetch(`${siteUrl}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({ slug: created.slug, path: "/" }),
        });
      } catch (e) {
        console.error("[revalidate] request failed:", e?.message || e);
      }
    }
    return created;
  }

  return {
    fetchJson, findCategoryBySlug, findRegionBySlug, findAuthorByName, createAuthor,
    uploadMedia, uploadImage, searchArticlesByTitle, updateArticle, createArticle,
    async getRecentArticles(limit = 5) {
      const data = await fetchJson(`/api/articles?sort[0]=publication_date:desc&pagination[pageSize]=${limit}&pagination[page]=1&fields[0]=title&fields[1]=slug`);
      return (data?.data || []).map(x => ({ title: x.title, slug: x.slug }));
    },
  };
}

module.exports = { createStrapiClient };