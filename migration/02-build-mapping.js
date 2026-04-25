/**
 * 02-build-mapping.js
 *
 * Берёт en-articles-dump.json (сделанный 01-м скриптом) и
 * список русских статей из текущего Strapi. Выдаёт CSV
 * mapping_to_review.csv со столбцами:
 *
 *   ru_documentId, ru_title, ru_publication_date, ru_slug,
 *   wp_id_suggested, wp_title_suggested, wp_date_suggested,
 *   confidence, match_action
 *
 * confidence — оценка уверенности в матче (0..1).
 * match_action — пустая колонка, ты заполняешь сам:
 *   APPLY  — применить этот матч
 *   SKIP   — пропустить (нет английской версии)
 *   <wp_id> — переопределить wp_id вручную
 *
 * Никаких изменений в Strapi не вносит.
 *
 * Запуск: node 02-build-mapping.js
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error("Set STRAPI_URL and STRAPI_TOKEN in .env");
  process.exit(1);
}

const OUT_DIR = "output";

/** Получить ВСЕ статьи из Strapi. */
async function fetchAllRuArticles() {
  const all = [];
  let page = 1;
  while (true) {
    const url =
      `${STRAPI_URL}/api/articles` +
      `?pagination[page]=${page}&pagination[pageSize]=100` +
      `&fields[0]=title&fields[1]=slug&fields[2]=publication_date&fields[3]=is_translated_en` +
      `&sort[0]=publication_date:desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Strapi ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const items = data.data || [];
    if (items.length === 0) break;
    all.push(...items);
    const total = data.meta?.pagination?.pageCount ?? 1;
    if (page >= total) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

/** Простая дистанция между двумя нормализованными заголовками. */
function similarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

/** Эвристика: насколько даты близки (0..1). */
function dateProximity(ruIso, wpIso) {
  if (!ruIso || !wpIso) return 0;
  const ru = new Date(ruIso).getTime();
  const wp = new Date(wpIso).getTime();
  if (isNaN(ru) || isNaN(wp)) return 0;
  const diffDays = Math.abs(ru - wp) / 86400000;
  if (diffDays < 1) return 1.0;
  if (diffDays < 7) return 0.9;
  if (diffDays < 30) return 0.6;
  if (diffDays < 90) return 0.3;
  return 0.1;
}

/** Транслит slug → латиница для слабого матча с EN-slug. */
function slugSimilarity(ruSlug, enSlug) {
  if (!ruSlug || !enSlug) return 0;
  // Очень слабая эвристика: количество общих 3-граммов
  const a = ruSlug.toLowerCase();
  const b = enSlug.toLowerCase();
  const ngramsA = new Set();
  const ngramsB = new Set();
  for (let i = 0; i < a.length - 2; i++) ngramsA.add(a.slice(i, i + 3));
  for (let i = 0; i < b.length - 2; i++) ngramsB.add(b.slice(i, i + 3));
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;
  let common = 0;
  for (const g of ngramsA) if (ngramsB.has(g)) common++;
  return common / Math.max(ngramsA.size, ngramsB.size);
}

function writeCsv(path, rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(","));
  }
  writeFileSync(path, lines.join("\n"), "utf-8");
}

function normalizeForMatch(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Loading EN dump...");
  const enDump = JSON.parse(
    readFileSync(join(OUT_DIR, "en-articles-dump.json"), "utf-8"),
  );
  console.log(`  ${enDump.length} EN posts`);

  console.log("Fetching RU articles from Strapi...");
  const ruArticles = await fetchAllRuArticles();
  console.log(`  ${ruArticles.length} RU articles`);

  // Для каждой RU-статьи найдём лучший кандидат среди EN
  const mapping = ruArticles.map((ru) => {
    const ruTitleNorm = normalizeForMatch(ru.title || "");
    let best = null;
    let bestScore = 0;

    for (const en of enDump) {
      const titleScore = similarity(ruTitleNorm, en.title_normalized);
      const dateScore = dateProximity(ru.publication_date, en.date_old);
      const slugScore = slugSimilarity(ru.slug, en.wp_slug);
      // Заголовок весит больше всего, дата помогает разрешить дубликаты,
      // slug — слабый сигнал.
      const score = titleScore * 0.5 + dateScore * 0.35 + slugScore * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = en;
      }
    }

    return {
      ru_documentId: ru.documentId,
      ru_id: ru.id,
      ru_title: ru.title,
      ru_publication_date: ru.publication_date,
      ru_slug: ru.slug,
      already_translated: ru.is_translated_en ? "YES" : "",
      wp_id_suggested: best?.wp_id ?? "",
      wp_title_suggested: best?.title_old_en ?? "",
      wp_date_suggested: best?.date_old ?? "",
      wp_link_suggested: best?.wp_link ?? "",
      confidence: bestScore.toFixed(2),
      match_action: "", // ← заполняешь сам: APPLY / SKIP / <wp_id>
    };
  });

  // Сортируем: сначала с уже-переведёнными, потом по убыванию confidence
  mapping.sort((a, b) => {
    if (a.already_translated && !b.already_translated) return -1;
    if (!a.already_translated && b.already_translated) return 1;
    return parseFloat(b.confidence) - parseFloat(a.confidence);
  });

  writeCsv(
    join(OUT_DIR, "mapping_to_review.csv"),
    mapping,
    [
      "ru_documentId",
      "ru_id",
      "ru_title",
      "ru_publication_date",
      "ru_slug",
      "already_translated",
      "wp_id_suggested",
      "wp_title_suggested",
      "wp_date_suggested",
      "wp_link_suggested",
      "confidence",
      "match_action",
    ],
  );

  console.log("\n✅ Done. Output:");
  console.log(`   output/mapping_to_review.csv (${mapping.length} rows)`);
  console.log("\nNext step: open the CSV in Excel/Google Sheets and fill in");
  console.log("the 'match_action' column for each row:");
  console.log("  APPLY     — apply the suggested match");
  console.log("  SKIP      — no English version exists");
  console.log("  <wp_id>   — use a different wp_id (find it in en-articles-dump.csv)");

  // Статистика
  const high = mapping.filter((m) => parseFloat(m.confidence) >= 0.7).length;
  const mid = mapping.filter(
    (m) => parseFloat(m.confidence) >= 0.4 && parseFloat(m.confidence) < 0.7,
  ).length;
  const low = mapping.filter((m) => parseFloat(m.confidence) < 0.4).length;
  console.log("\nConfidence distribution:");
  console.log(`  high  (≥0.70): ${high}  ← likely correct, just verify`);
  console.log(`  mid   (0.40-0.70): ${mid}  ← needs careful review`);
  console.log(`  low   (<0.40): ${low}  ← probably no EN version, or rename happened`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
