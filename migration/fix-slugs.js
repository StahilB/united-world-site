/**
 * Исправляет slug статей в Strapi по транслитерации заголовка.
 * Запуск: node migration/fix-slugs.js (из корня репозитория) или cd migration && node fix-slugs.js
 *
 * Env: STRAPI_URL, STRAPI_TOKEN
 */

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const STRAPI = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.STRAPI_TOKEN;

if (!TOKEN) {
  console.error("STRAPI_TOKEN is required.");
  process.exit(1);
}

/** Транслитерация по заданной таблице (кириллица → латиница). */
const CYRILLIC_TO_LATIN = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "j",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/**
 * Slug из заголовка: транслитерация, пробелы/спецсимволы → дефис, схлопывание дефисов.
 * @param {string} title
 * @returns {string}
 */
function slugFromTitle(title) {
  const s = String(title ?? "").trim();
  if (!s) return "article";

  let out = "";
  const lower = s.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i];
    if (CYRILLIC_TO_LATIN[ch] !== undefined) {
      out += CYRILLIC_TO_LATIN[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += "-";
    }
  }

  out = out
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);

  return out || "article";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...opts.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text || res.statusText;
    throw new Error(`${res.status} ${url}: ${msg}`);
  }
  return data;
}

async function fetchAllArticles() {
  const pageSize = 200;
  let page = 1;
  const all = [];
  for (;;) {
    const q = new URLSearchParams();
    q.set("pagination[pageSize]", String(pageSize));
    q.set("pagination[page]", String(page));
    const url = `${STRAPI}/api/articles?${q.toString()}`;
    const res = await fetchJson(url);
    const rows = Array.isArray(res?.data)
      ? res.data.map(normalizeArticleEntry)
      : [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
    await sleep(80);
  }
  return all;
}

/** Strapi v4: { id, attributes }; плоский документ Strapi 5: поля на верхнем уровне. */
function normalizeArticleEntry(raw) {
  if (!raw) return raw;
  if (raw.attributes && typeof raw.attributes === "object") {
    return {
      id: raw.id,
      documentId: raw.documentId,
      ...raw.attributes,
    };
  }
  return raw;
}

function articleUpdatePath(article) {
  const id = article.documentId ?? article.id;
  if (id == null || id === "") {
    throw new Error("Article has no documentId or id");
  }
  return `${STRAPI}/api/articles/${id}`;
}

async function main() {
  console.log(`Strapi: ${STRAPI}`);
  console.log("Fetching articles…");

  const articles = await fetchAllArticles();
  console.log(`Total: ${articles.length}\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    const title = article.title ?? "";
    const oldSlug = article.slug ?? "";
    const newSlug = slugFromTitle(title);

    if (newSlug === oldSlug) {
      skipped += 1;
      continue;
    }

    try {
      await fetchJson(articleUpdatePath(article), {
        method: "PUT",
        body: JSON.stringify({ data: { slug: newSlug } }),
      });
      console.log(`Fixed: ${oldSlug} → ${newSlug}`);
      fixed += 1;
    } catch (e) {
      console.error(`  FAIL id=${article.id}: ${e.message}`);
      failed += 1;
    }
    await sleep(50);
  }

  console.log(`\nDone. Fixed: ${fixed}, unchanged: ${skipped}, failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
