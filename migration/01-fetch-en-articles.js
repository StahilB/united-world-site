/**
 * 01-fetch-en-articles.js
 *
 * Скачивает все опубликованные посты со старого en.anounitedworld.com
 * (WordPress REST API) и сохраняет в output/en-articles-dump.json
 * + output/en-articles-dump.csv для удобного просмотра в Excel.
 *
 * Никаких изменений на сервере не вносит.
 *
 * Запуск: node 01-fetch-en-articles.js
 */

import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.OLD_WP_BASE_URL || "https://en.anounitedworld.com";
const PER_PAGE = 100;
const OUT_DIR = "output";

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

/** Чистка HTML-сущностей в коротких полях (заголовок, excerpt). */
function decodeEntities(html) {
  if (!html) return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, ""); // strip HTML tags from short fields
}

/** Вытаскивает чистый excerpt: WP оборачивает в <p>...</p>. */
function cleanExcerpt(excerptRendered) {
  if (!excerptRendered) return "";
  return decodeEntities(excerptRendered).trim();
}

/** Скачать одну страницу постов. */
async function fetchPostsPage(page) {
  const url = `${BASE}/wp-json/wp/v2/posts?per_page=${PER_PAGE}&page=${page}&_embed=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 400 && page > 1) {
      // WP возвращает 400 когда страниц больше чем есть. Это означает конец.
      return null;
    }
    throw new Error(`WP API ${res.status} on page ${page}`);
  }
  return res.json();
}

/** Извлекает категории и теги из _embedded. */
function extractTaxonomies(post) {
  const categories = [];
  const tags = [];
  const wpTerm = post._embedded?.["wp:term"] || [];
  for (const group of wpTerm) {
    if (!Array.isArray(group)) continue;
    for (const term of group) {
      if (term.taxonomy === "category") categories.push(term.name);
      else if (term.taxonomy === "post_tag") tags.push(term.name);
    }
  }
  return {
    categories: categories.join("; "),
    tags: tags.join("; "),
  };
}

/** Извлекает URL обложки. */
function extractFeaturedImage(post) {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return "";
  return media.source_url || "";
}

/**
 * Извлекает первые N значимых слов из заголовка для матчинга.
 * "August 2025 World Review: Africa" → "august 2025 world review africa"
 */
function normalizeForMatch(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Сохранение CSV. */
function writeCsv(filePath, rows, columns) {
  const header = columns.join(",");
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [header];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(","));
  }
  writeFileSync(filePath, lines.join("\n"), "utf-8");
}

async function main() {
  console.log(`Fetching from ${BASE}...`);
  const allPosts = [];
  let page = 1;
  while (true) {
    console.log(`  page ${page}...`);
    const posts = await fetchPostsPage(page);
    if (!posts || posts.length === 0) break;
    allPosts.push(...posts);
    if (posts.length < PER_PAGE) break;
    page++;
    if (page > 50) {
      console.warn("Aborting at page 50 — too many pages?");
      break;
    }
  }

  console.log(`Total posts fetched: ${allPosts.length}`);

  const cleaned = allPosts.map((post) => {
    const title = decodeEntities(post.title?.rendered ?? "");
    const excerpt = cleanExcerpt(post.excerpt?.rendered ?? "");
    const contentHtml = post.content?.rendered ?? "";
    const taxo = extractTaxonomies(post);
    return {
      wp_id: post.id,
      wp_slug: post.slug,
      wp_link: post.link,
      title_old_en: title,
      excerpt_old_en: excerpt,
      content_html_old_en: contentHtml,
      content_length: contentHtml.length,
      content_word_count: contentHtml
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2).length,
      date_old: post.date,
      date_modified_old: post.modified,
      featured_image_url: extractFeaturedImage(post),
      categories_old: taxo.categories,
      tags_old: taxo.tags,
      title_normalized: normalizeForMatch(title),
    };
  });

  // JSON — полный дамп со всем content_html для скрипта 02
  writeFileSync(
    join(OUT_DIR, "en-articles-dump.json"),
    JSON.stringify(cleaned, null, 2),
    "utf-8",
  );

  // CSV — короткая версия для просмотра в Excel (без content_html — там HTML на сотни КБ)
  const csvRows = cleaned.map((p) => ({
    wp_id: p.wp_id,
    wp_slug: p.wp_slug,
    wp_link: p.wp_link,
    title_old_en: p.title_old_en,
    date_old: p.date_old,
    word_count: p.content_word_count,
    categories_old: p.categories_old,
    featured_image: p.featured_image_url,
    excerpt_preview: p.excerpt_old_en.slice(0, 200),
  }));
  writeCsv(
    join(OUT_DIR, "en-articles-dump.csv"),
    csvRows,
    [
      "wp_id",
      "wp_slug",
      "wp_link",
      "title_old_en",
      "date_old",
      "word_count",
      "categories_old",
      "featured_image",
      "excerpt_preview",
    ],
  );

  console.log("\n✅ Done. Outputs:");
  console.log(`   output/en-articles-dump.json (full data, ${cleaned.length} posts)`);
  console.log("   output/en-articles-dump.csv  (preview for Excel)");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
