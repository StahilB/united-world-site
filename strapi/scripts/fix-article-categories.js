#!/usr/bin/env node
/**
 * Миграция: убрать категорию «Авторские колонки», выставить Section по format / region / тематикам.
 * Только поля categories и sections статьи; author, region, format не меняются.
 *
 * Читает `strapi/.env` и опционально `strapi/.env.local`.
 * Env: STRAPI_URL (в Docker-сети часто http://strapi:1337), STRAPI_TOKEN
 *
 * Запуск из каталога strapi/: npm run fix-article-categories
 * Идемпотентен: повторный запуск пересчитывает те же привязки.
 */

const fs = require("fs");
const path = require("path");

/** Корень приложения Strapi (каталог `strapi/`) */
const STRAPI_ROOT = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(STRAPI_ROOT, ".env.local"));
loadEnvFile(path.join(STRAPI_ROOT, ".env"));

const STRAPI = (
  process.env.STRAPI_URL || "http://strapi:1337"
).replace(/\/$/, "");
const TOKEN = process.env.STRAPI_TOKEN || "";

/** Slug категории «Авторские колонки» (и возможные варианты) — удаляются из статей и из коллекции Category */
const AUTHORSKIE_CATEGORY_SLUGS = new Set([
  "avtorskie-kolonki",
  "avtorskie-kolonki-ekspertiza",
]);

/** Тематическая категория (slug) → Section «По темам» (slug) */
const CATEGORY_SLUG_TO_SECTION_SLUG = {
  "mezhdunarodnaya-bezopasnost": "mezhdunarodnaya-bezopasnost-po-temam",
  "politika-i-diplomatiya": "politika-i-diplomatiya-po-temam",
  "ekonomika-i-razvitie": "ekonomika-i-razvitie-po-temam",
  "energetika-i-resursy": "energiya-i-resursy-po-temam",
  "ekologiya-i-klimat": "ekologiya-i-klimat-po-temam",
  "obrazovanie-i-kultura": "obrazovanie-nauka-i-kultura-po-temam",
  "mezhdunarodnye-organizatsii": "mezhdunarodnye-organizatsii-po-temam",
  "mezhdunarodnye-meropriyatiya": "mezhdunarodnye-meropriyatiya-po-temam",
};

/** slug региона в Strapi → базовый сегмент slug Section у «По регионам» / «Глобальные обзоры» */
const REGION_SLUG_TO_BASE = {
  rossiya: "rossiya",
  evropa: "evropa",
  afrika: "afrika",
  kavkaz: "kavkaz",
  arktika: "arktika",
  "latinskaya-amerika": "latinskaya-amerika",
  "tsentralnaya-aziya": "tsentralnaya-aziya",
  "yuzhnaya-aziya": "yuzhnaya-aziya",
  "yugo-vostochnaya-aziya": "yugo-vostochnaya-aziya",
  "severnaya-amerika": "severnaya-amerika",
  "blizhniy-vostok": "blizhniy-vostok",
  "blizhnij-vostok": "blizhniy-vostok",
  "vostochnaya-aziya-i-atp": "vostochnaya-aziya-i-atp",
  "vostochnaya-aziya-i-atr": "vostochnaya-aziya-i-atp",
  "avstraliya-i-okeaniya": "avstraliya-i-okeaniya",
};

const SECTION_FORMAT = {
  колонка: "avtorskie-kolonki-ekspertiza",
  мнение: "mneniya-ekspertiza",
  интервью: "intervyu-ekspertiza",
  анализ: "analitika",
};

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function apiGet(urlPath) {
  const res = await fetch(`${STRAPI}${urlPath}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${urlPath} ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPut(urlPath, body) {
  const res = await fetch(`${STRAPI}${urlPath}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PUT ${urlPath} ${res.status}: ${t}`);
  }
  return res.json().catch(() => ({}));
}

async function apiDelete(urlPath) {
  const res = await fetch(`${STRAPI}${urlPath}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DELETE ${urlPath} ${res.status}: ${t}`);
  }
}

async function fetchAllSections() {
  const bySlug = new Map();
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set("pagination[page]", String(page));
    q.set("pagination[pageSize]", "100");
    q.set("fields[0]", "slug");
    const data = await apiGet(`/api/sections?${q}`);
    for (const row of data.data || []) {
      if (row.slug) bySlug.set(row.slug, row.id);
    }
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return bySlug;
}

async function fetchAllCategories() {
  const list = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set("pagination[page]", String(page));
    q.set("pagination[pageSize]", "100");
    const data = await apiGet(`/api/categories?${q}`);
    list.push(...(data.data || []));
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return list;
}

function regionSlugToPoRegionamSectionSlug(regionSlug) {
  if (!regionSlug) return null;
  const base = REGION_SLUG_TO_BASE[regionSlug] || regionSlug;
  return `${base}-po-regionam`;
}

function regionSlugToGlobalObzoryChildSectionSlug(regionSlug) {
  if (!regionSlug) return null;
  const base = REGION_SLUG_TO_BASE[regionSlug] || regionSlug;
  return `${base}-globalnye-obzory`;
}

function normalizeCategories(categories, stripIds) {
  return (categories || [])
    .filter(
      (c) =>
        c &&
        !stripIds.has(c.id) &&
        !AUTHORSKIE_CATEGORY_SLUGS.has(c.slug) &&
        (c.name || "").trim() !== "Авторские колонки",
    )
    .map((c) => c.id);
}

function computeSectionSlugs(article, sectionBySlug) {
  const slugs = new Set();
  const fmt = article.format;
  const g = SECTION_FORMAT[fmt];
  if (g) slugs.add(g);

  if (fmt === "обзор" && article.is_global_review === true) {
    if (sectionBySlug.has("globalnye-obzory")) {
      slugs.add("globalnye-obzory");
    }
    const rslug = article.region?.slug;
    if (rslug) {
      const sub = regionSlugToGlobalObzoryChildSectionSlug(rslug);
      if (sub && sectionBySlug.has(sub)) slugs.add(sub);
    }
  }

  const rslug = article.region?.slug;
  if (rslug) {
    const pr = regionSlugToPoRegionamSectionSlug(rslug);
    if (pr && sectionBySlug.has(pr)) slugs.add(pr);
  }

  for (const c of article.categories || []) {
    if (!c?.slug || AUTHORSKIE_CATEGORY_SLUGS.has(c.slug)) continue;
    const secSlug = CATEGORY_SLUG_TO_SECTION_SLUG[c.slug];
    if (secSlug && sectionBySlug.has(secSlug)) slugs.add(secSlug);
  }

  return [...slugs].map((s) => sectionBySlug.get(s)).filter(Boolean);
}

function sameIds(a, b) {
  const x = [...new Set(a)].sort((m, n) => m - n);
  const y = [...new Set(b)].sort((m, n) => m - n);
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

async function fetchAllArticles() {
  const out = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set("pagination[page]", String(page));
    q.set("pagination[pageSize]", "50");
    q.set("populate[0]", "categories");
    q.set("populate[1]", "sections");
    q.set("populate[2]", "region");
    const data = await apiGet(`/api/articles?${q}`);
    out.push(...(data.data || []));
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return out;
}

async function main() {
  if (!TOKEN) {
    console.error("STRAPI_TOKEN обязателен.");
    process.exit(1);
  }

  console.log("[fix-article-categories] STRAPI_URL=%s", STRAPI);

  const sectionBySlug = await fetchAllSections();
  console.log(
    "[fix-article-categories] загружено section slug→id: %d",
    sectionBySlug.size,
  );

  const categories = await fetchAllCategories();
  const authorskieCategoryIds = new Set();
  for (const c of categories) {
    if (
      AUTHORSKIE_CATEGORY_SLUGS.has(c.slug) ||
      (c.name && String(c.name).trim() === "Авторские колонки")
    ) {
      authorskieCategoryIds.add(c.id);
      console.log(
        "[fix-article-categories] категория к удалению из статей: id=%s slug=%s name=%s",
        c.id,
        c.slug,
        c.name,
      );
    }
  }

  const articles = await fetchAllArticles();
  console.log("[fix-article-categories] статей: %d", articles.length);

  let updated = 0;
  let skipped = 0;

  for (const article of articles) {
    const newCategoryIds = normalizeCategories(
      article.categories,
      authorskieCategoryIds,
    );
    const newSectionIds = computeSectionSlugs(article, sectionBySlug);

    const oldCategoryIds = (article.categories || []).map((c) => c.id);
    const oldSectionIds = (article.sections || []).map((s) => s.id);

    if (
      sameIds(oldCategoryIds, newCategoryIds) &&
      sameIds(oldSectionIds, newSectionIds)
    ) {
      skipped += 1;
      continue;
    }

    console.log(
      "[fix-article-categories] article id=%s slug=%s → categories %j sections %j",
      article.id,
      article.slug,
      newCategoryIds,
      newSectionIds,
    );

    await apiPut(`/api/articles/${article.id}`, {
      data: {
        categories: newCategoryIds,
        sections: newSectionIds,
      },
    });
    updated += 1;
  }

  console.log(
    "[fix-article-categories] готово: обновлено %d, без изменений %d",
    updated,
    skipped,
  );

  for (const c of categories) {
    if (
      AUTHORSKIE_CATEGORY_SLUGS.has(c.slug) ||
      (c.name && String(c.name).trim() === "Авторские колонки")
    ) {
      try {
        console.log(
          "[fix-article-categories] DELETE category id=%s slug=%s",
          c.id,
          c.slug,
        );
        await apiDelete(`/api/categories/${c.id}`);
      } catch (e) {
        console.error(
          "[fix-article-categories] не удалось удалить category %s: %s",
          c.id,
          e.message,
        );
      }
    }
  }

  console.log("[fix-article-categories] завершено.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
