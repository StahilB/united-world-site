/**
 * 02-build-mapping.js
 *
 * Берёт en-articles-dump.json и список русских статей из Strapi.
 * Делает подсказки для ручного мэппинга в mapping_to_review.csv.
 *
 * Логика confidence (новая версия):
 *   - 0.55  ← дата ±1 день  (главный сигнал)
 *   - 0.25  ← имя файла обложки совпадает (сильный сигнал)
 *   - 0.20  ← общие 4+-буквенные слова в заголовках (слабый)
 *
 * Чем выше confidence, тем надёжнее предложение.
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

/** Скачать ВСЕ статьи из Strapi с populate cover_image. */
async function fetchAllRuArticles() {
  const all = [];
  let page = 1;
  while (true) {
    const url =
      `${STRAPI_URL}/api/articles` +
      `?pagination[page]=${page}&pagination[pageSize]=100` +
      `&fields[0]=title&fields[1]=slug&fields[2]=publication_date` +
      `&fields[3]=is_translated_en&fields[4]=title_en` +
      `&populate[cover_image][fields][0]=name&populate[cover_image][fields][1]=url` +
      `&sort[0]=publication_date:desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Strapi ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const items = data.data || [];
    if (items.length === 0) break;
    all.push(...items);
    const totalPages = data.meta?.pagination?.pageCount ?? 1;
    if (page >= totalPages) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

/** Нормализованная дата без времени. */
function dateOnly(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Дни между датами. */
function daysDiff(isoA, isoB) {
  if (!isoA || !isoB) return Infinity;
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (isNaN(a) || isNaN(b)) return Infinity;
  return Math.abs(a - b) / 86400000;
}

/** Имя файла из URL обложки (без расширения, нижний регистр). */
function imageBasename(url) {
  if (!url) return "";
  try {
    // /wp-content/uploads/2026/04/Counsil-1.png → Counsil-1
    // /uploads/Trump_Main_0ef202dd11.jpg → Trump_Main_0ef202dd11
    const last = url.split("/").pop() || "";
    return last
      .replace(/\.(png|jpg|jpeg|webp|gif|avif)$/i, "")
      .toLowerCase()
      .replace(/[\-_]+\d+$/, "") // убираем -1, _2 в конце (WP добавляет при перезаливке)
      .replace(/_[a-f0-9]{8,}$/, ""); // убираем хэш-суффикс Strapi
  } catch {
    return "";
  }
}

/** Похожесть имён файлов обложек (0..1). */
function imageNameSimilarity(ruImg, enImg) {
  const a = imageBasename(ruImg);
  const b = imageBasename(enImg);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  // Частичное совпадение: одно из имён — подстрока другого
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) {
    return 0.7;
  }
  // Общие 4+-граммы
  const ngramsA = new Set();
  const ngramsB = new Set();
  for (let i = 0; i < a.length - 3; i++) ngramsA.add(a.slice(i, i + 4));
  for (let i = 0; i < b.length - 3; i++) ngramsB.add(b.slice(i, i + 4));
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;
  let common = 0;
  for (const g of ngramsA) if (ngramsB.has(g)) common++;
  const score = common / Math.max(ngramsA.size, ngramsB.size);
  return score > 0.4 ? score * 0.5 : 0; // слабый сигнал — половиним
}

/** Похожесть нормализованных текстов (0..1) по словам 4+ букв. */
function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const norm = (t) =>
    t
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const wordsA = new Set(norm(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(norm(b).split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

function dateScore(dRu, dEn) {
  const diff = daysDiff(dRu, dEn);
  if (diff === Infinity) return 0;
  if (diff < 1) return 1.0;
  if (diff < 3) return 0.85;
  if (diff < 7) return 0.6;
  if (diff < 14) return 0.4;
  if (diff < 30) return 0.2;
  return 0;
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

async function main() {
  console.log("Loading EN dump...");
  const enDump = JSON.parse(
    readFileSync(join(OUT_DIR, "en-articles-dump.json"), "utf-8"),
  );
  console.log(`  ${enDump.length} EN posts`);

  console.log("Fetching RU articles from Strapi...");
  const ruArticles = await fetchAllRuArticles();
  console.log(`  ${ruArticles.length} RU articles`);

  // Для каждой RU-статьи находим топ-3 кандидата
  const mapping = ruArticles.map((ru) => {
    const ruCoverUrl = ru.cover_image?.url || ru.cover_image?.name || "";
    const candidates = enDump.map((en) => {
      const dScore = dateScore(ru.publication_date, en.date_old);
      const iScore = imageNameSimilarity(ruCoverUrl, en.featured_image_url);
      const tScore = textSimilarity(ru.title || "", en.title_old_en);
      const total = dScore * 0.55 + iScore * 0.25 + tScore * 0.2;
      return { en, dScore, iScore, tScore, total };
    });

    candidates.sort((a, b) => b.total - a.total);
    const top = candidates.slice(0, 3);
    const best = top[0] || null;
    const second = top[1] || null;
    const third = top[2] || null;

    return {
      ru_documentId: ru.documentId,
      ru_id: ru.id,
      ru_title: ru.title,
      ru_publication_date: ru.publication_date,
      ru_slug: ru.slug,
      already_translated: ru.is_translated_en ? "YES" : "",
      // Топ-1 предложение
      wp_id_suggested: best?.en?.wp_id ?? "",
      wp_title_suggested: best?.en?.title_old_en ?? "",
      wp_date_suggested: best?.en?.date_old ?? "",
      wp_link_suggested: best?.en?.wp_link ?? "",
      confidence: best ? best.total.toFixed(2) : "0.00",
      score_date: best ? best.dScore.toFixed(2) : "",
      score_image: best ? best.iScore.toFixed(2) : "",
      score_text: best ? best.tScore.toFixed(2) : "",
      // Второй кандидат — на случай если первый ошибся
      alt2_wp_id: second?.en?.wp_id ?? "",
      alt2_title: second?.en?.title_old_en ?? "",
      alt2_confidence: second ? second.total.toFixed(2) : "",
      // Третий
      alt3_wp_id: third?.en?.wp_id ?? "",
      alt3_title: third?.en?.title_old_en ?? "",
      alt3_confidence: third ? third.total.toFixed(2) : "",
      // Колонка для твоего ввода
      match_action: "",
    };
  });

  // Сортировка: уже-переведённые в начало, потом по убыванию confidence
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
      "score_date",
      "score_image",
      "score_text",
      "alt2_wp_id",
      "alt2_title",
      "alt2_confidence",
      "alt3_wp_id",
      "alt3_title",
      "alt3_confidence",
      "match_action",
    ],
  );

  console.log("\n✅ Done. Output: output/mapping_to_review.csv");
  console.log("\nNext step: open the CSV in Excel/Google Sheets, fill in");
  console.log("the 'match_action' column for each row:");
  console.log("  APPLY      — apply the top suggestion (wp_id_suggested)");
  console.log("  ALT2       — actually it's the 2nd suggestion");
  console.log("  ALT3       — actually it's the 3rd suggestion");
  console.log("  <wp_id>    — use a different wp_id (lookup in en-articles-dump.csv)");
  console.log("  SKIP       — no English version exists");

  // Статистика
  const high = mapping.filter((m) => parseFloat(m.confidence) >= 0.7).length;
  const mid = mapping.filter(
    (m) => parseFloat(m.confidence) >= 0.4 && parseFloat(m.confidence) < 0.7,
  ).length;
  const low = mapping.filter((m) => parseFloat(m.confidence) < 0.4).length;
  console.log(`\nConfidence distribution among ${mapping.length} RU articles:`);
  console.log(`  high  (≥0.70): ${high}  ← likely correct, just verify`);
  console.log(`  mid   (0.40-0.70): ${mid}  ← needs careful review`);
  console.log(`  low   (<0.40): ${low}  ← probably no EN version, or rename happened`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
