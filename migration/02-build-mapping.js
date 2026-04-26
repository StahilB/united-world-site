/**
 * 02-build-mapping.js (v2)
 *
 * Улучшенный матчинг RU↔EN со скорингом по:
 *   - дате публикации (главный сигнал)
 *   - имени файла обложки
 *   - совпадению регионов/тематик в заголовках (новый!)
 *   - общим словам в заголовках
 *
 * Автоматически проставляет match_action=APPLY где confidence ≥ 0.80
 * (с проверкой что wp_id используется уникально). Остальные строки
 * оставляет пустыми для ручной проверки.
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
const AUTO_APPLY_THRESHOLD = 0.8;

/** Региональные/тематические ключи RU→EN для бонуса при совпадении. */
const KEYWORD_PAIRS = [
  // Регионы (более специфичные — выше)
  { ru: ["юго-восточн", "юва"], en: ["southeast asia", "south-east asia", "south east"], group: "region" },
  { ru: ["восточн", " атр"], en: ["east asia", "eastern asia", "asia-pacific", "asia pacific"], group: "region" },
  { ru: ["северн", " амери"], en: ["north america", "northern america"], group: "region" },
  { ru: ["латинск", " амери"], en: ["latin america", "caribbean"], group: "region" },
  { ru: ["карибск"], en: ["caribbean"], group: "region" },
  { ru: ["центральн", " азии"], en: ["central asia"], group: "region" },
  { ru: ["центральн", " азия"], en: ["central asia"], group: "region" },
  { ru: ["южн", " азии"], en: ["south asia", "southern asia"], group: "region" },
  { ru: ["южн", " азия"], en: ["south asia", "southern asia"], group: "region" },
  { ru: ["россии", "россия", "российск"], en: ["russia", "russian"], group: "region" },
  { ru: ["европ"], en: ["europe", "european"], group: "region" },
  { ru: ["ближнем восток", "ближний восток"], en: ["middle east", "near east"], group: "region" },
  { ru: ["африк"], en: ["africa", "sub-saharan", "subsaharan"], group: "region" },
  { ru: ["кавказ"], en: ["caucasus"], group: "region" },
  { ru: ["австрали"], en: ["australia"], group: "region" },
  { ru: ["океании", "океания"], en: ["oceania"], group: "region" },
  { ru: ["арктик"], en: ["arctic"], group: "region" },

  // Темы (Categories)
  { ru: ["политич", "дипломат"], en: ["political", "politics", "diplomacy"], group: "topic" },
  { ru: ["экономич"], en: ["economic", "economy"], group: "topic" },
  { ru: ["энерг"], en: ["energy"], group: "topic" },
  { ru: ["экологи", "климат"], en: ["ecology", "climate", "environmental"], group: "topic" },
  { ru: ["безопасност"], en: ["security"], group: "topic" },
  { ru: ["образован"], en: ["education"], group: "topic" },

  // Форматы
  { ru: ["ежемесячн", "месячн"], en: ["monthly"], group: "format" },
  { ru: ["обзор"], en: ["review", "overview"], group: "format" },
  { ru: ["глобальн"], en: ["global"], group: "format" },
];

function extractKeywords(text, side) {
  const lower = (text || "").toLowerCase();
  const matched = new Map(); // group -> Set of matched keys
  for (const pair of KEYWORD_PAIRS) {
    const list = side === "ru" ? pair.ru : pair.en;
    for (const k of list) {
      if (lower.includes(k)) {
        const key = pair.ru[0]; // canonical key
        if (!matched.has(pair.group)) matched.set(pair.group, new Set());
        matched.get(pair.group).add(key);
        break;
      }
    }
  }
  return matched;
}

function keywordMatchScore(ruTitle, enTitle) {
  const ruMap = extractKeywords(ruTitle, "ru");
  const enMap = extractKeywords(enTitle, "en");
  if (ruMap.size === 0 && enMap.size === 0) return 0;

  let score = 0;
  let antiSignal = 0;
  const groups = ["region", "topic", "format"];
  const weights = { region: 0.6, topic: 0.25, format: 0.15 };

  for (const g of groups) {
    const ruKeys = ruMap.get(g);
    const enKeys = enMap.get(g);
    if (!ruKeys && !enKeys) continue;
    if (ruKeys && enKeys) {
      // Пересечение
      let intersect = 0;
      for (const k of ruKeys) if (enKeys.has(k)) intersect++;
      const total = new Set([...ruKeys, ...enKeys]).size;
      if (total > 0) {
        score += weights[g] * (intersect / total);
        // Если в RU и EN есть keys одной группы, но НЕ совпадают — это очень
        // плохой знак (например, RU="Африка", EN="Латинская Америка")
        if (intersect === 0 && g === "region") antiSignal += 0.5;
      }
    } else if (g === "region" && ruKeys && !enKeys) {
      // В RU указан регион, в EN никакой региональной привязки — слабый минус
      antiSignal += 0.15;
    }
  }

  return Math.max(-1, score - antiSignal);
}

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

function daysDiff(isoA, isoB) {
  if (!isoA || !isoB) return Infinity;
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (isNaN(a) || isNaN(b)) return Infinity;
  return Math.abs(a - b) / 86400000;
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

function imageBasename(url) {
  if (!url) return "";
  const last = url.split("/").pop() || "";
  return last
    .replace(/\.(png|jpg|jpeg|webp|gif|avif)$/i, "")
    .toLowerCase()
    .replace(/[\-_]+\d+$/, "")
    .replace(/_[a-f0-9]{8,}$/, "");
}

function imageNameSimilarity(ruImg, enImg) {
  const a = imageBasename(ruImg);
  const b = imageBasename(enImg);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) return 0.7;
  return 0;
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const norm = (t) =>
    t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const wordsA = new Set(norm(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(norm(b).split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
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

  // Веса главного скоринга
  const W_DATE = 0.40;
  const W_KEYWORDS = 0.35; // новый!
  const W_IMAGE = 0.15;
  const W_TEXT = 0.10;

  const mapping = ruArticles.map((ru) => {
    const ruCoverUrl = ru.cover_image?.url || ru.cover_image?.name || "";

    const candidates = enDump.map((en) => {
      const dScore = dateScore(ru.publication_date, en.date_old);
      const iScore = imageNameSimilarity(ruCoverUrl, en.featured_image_url);
      const tScore = textSimilarity(ru.title || "", en.title_old_en);
      const kScore = keywordMatchScore(ru.title || "", en.title_old_en);
      const total =
        dScore * W_DATE +
        Math.max(0, kScore) * W_KEYWORDS +
        iScore * W_IMAGE +
        tScore * W_TEXT;
      // Жёсткое анти-правило: если регион в RU и EN явно разные — обнуляем
      const penalty = kScore < -0.3 ? -1 : 0;
      return {
        en,
        dScore,
        iScore,
        tScore,
        kScore,
        total: Math.max(0, total + penalty),
      };
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
      wp_id_suggested: best?.en?.wp_id ?? "",
      wp_title_suggested: best?.en?.title_old_en ?? "",
      wp_date_suggested: best?.en?.date_old ?? "",
      wp_link_suggested: best?.en?.wp_link ?? "",
      confidence: best ? best.total.toFixed(2) : "0.00",
      score_date: best ? best.dScore.toFixed(2) : "",
      score_keywords: best ? best.kScore.toFixed(2) : "",
      score_image: best ? best.iScore.toFixed(2) : "",
      score_text: best ? best.tScore.toFixed(2) : "",
      alt2_wp_id: second?.en?.wp_id ?? "",
      alt2_title: second?.en?.title_old_en ?? "",
      alt2_confidence: second ? second.total.toFixed(2) : "",
      alt3_wp_id: third?.en?.wp_id ?? "",
      alt3_title: third?.en?.title_old_en ?? "",
      alt3_confidence: third ? third.total.toFixed(2) : "",
      match_action: "",
    };
  });

  // АВТО-APPLY: где confidence >= AUTO_APPLY_THRESHOLD И wp_id уникален среди auto-apply
  const wpIdToRows = new Map();
  for (const m of mapping) {
    const conf = parseFloat(m.confidence);
    if (conf >= AUTO_APPLY_THRESHOLD && m.wp_id_suggested) {
      if (!wpIdToRows.has(m.wp_id_suggested)) {
        wpIdToRows.set(m.wp_id_suggested, []);
      }
      wpIdToRows.get(m.wp_id_suggested).push(m);
    }
  }

  // Если на один wp_id претендуют несколько строк — оставляем APPLY только у
  // строки с наивысшим confidence, остальные оставляем пустыми (ручное решение)
  for (const [, rows] of wpIdToRows.entries()) {
    rows.sort((a, b) => parseFloat(b.confidence) - parseFloat(a.confidence));
    rows[0].match_action = "APPLY";
    // У остальных конфликтных НЕ ставим APPLY — пусть пользователь сам решит
  }

  // Сортировка: уже-переведённые → потом по убыванию confidence
  mapping.sort((a, b) => {
    if (a.already_translated && !b.already_translated) return -1;
    if (!a.already_translated && b.already_translated) return 1;
    return parseFloat(b.confidence) - parseFloat(a.confidence);
  });

  writeCsv(
    join(OUT_DIR, "mapping_to_review.csv"),
    mapping,
    [
      "ru_documentId", "ru_id", "ru_title", "ru_publication_date",
      "ru_slug", "already_translated",
      "wp_id_suggested", "wp_title_suggested", "wp_date_suggested",
      "wp_link_suggested", "confidence",
      "score_date", "score_keywords", "score_image", "score_text",
      "alt2_wp_id", "alt2_title", "alt2_confidence",
      "alt3_wp_id", "alt3_title", "alt3_confidence",
      "match_action",
    ],
  );

  // Статистика
  const high = mapping.filter((m) => parseFloat(m.confidence) >= 0.7).length;
  const mid = mapping.filter(
    (m) => parseFloat(m.confidence) >= 0.4 && parseFloat(m.confidence) < 0.7,
  ).length;
  const low = mapping.filter((m) => parseFloat(m.confidence) < 0.4).length;
  const autoApplied = mapping.filter((m) => m.match_action === "APPLY").length;

  console.log(`\n✅ Done. Output: output/mapping_to_review.csv`);
  console.log(`\nConfidence distribution among ${mapping.length} RU articles:`);
  console.log(`  high  (≥0.70): ${high}`);
  console.log(`  mid   (0.40-0.70): ${mid}`);
  console.log(`  low   (<0.40): ${low}`);
  console.log(`\nAuto-APPLY (conf ≥ ${AUTO_APPLY_THRESHOLD}, unique wp_id): ${autoApplied}`);
  console.log(`\nManual review needed: ${mapping.length - autoApplied} rows`);
  console.log(`Open the CSV and fill in 'match_action' for unmarked rows:`);
  console.log(`  APPLY      — apply top suggestion`);
  console.log(`  ALT2 / ALT3 — actually it's the 2nd/3rd suggestion`);
  console.log(`  <wp_id>    — different wp_id (lookup in en-articles-dump.csv)`);
  console.log(`  SKIP       — no English version exists`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
