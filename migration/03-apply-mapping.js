/**
 * 03-apply-mapping.js
 *
 * Читает заполненный mapping_to_review.csv. Для каждой строки с
 * match_action != пусто — обновляет соответствующую RU-статью в
 * Strapi, заполняя ТОЛЬКО 4 поля:
 *   - title_en
 *   - excerpt_en
 *   - content_html_en
 *   - is_translated_en (= true)
 *
 * Никакие другие поля статьи не передаются и Strapi их не трогает.
 * Категории, регионы, секции, слаг, обложка, автор, дата, прочее
 * остаются как были.
 *
 * Запуск (DRY-RUN — без записи):
 *   node 03-apply-mapping.js --dry
 *
 * Запуск (РЕАЛЬНОЕ применение):
 *   node 03-apply-mapping.js
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DRY = process.argv.includes("--dry");

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error("Set STRAPI_URL and STRAPI_TOKEN in .env");
  process.exit(1);
}

const OUT_DIR = "output";
const MAPPING_FILE = join(OUT_DIR, "mapping_to_review.csv");
const DUMP_FILE = join(OUT_DIR, "en-articles-dump.json");
const LOG_FILE = join(OUT_DIR, "apply-log.txt");

if (!existsSync(MAPPING_FILE)) {
  console.error(`File not found: ${MAPPING_FILE}`);
  console.error(`Run 02-build-mapping.js first.`);
  process.exit(1);
}
if (!existsSync(DUMP_FILE)) {
  console.error(`File not found: ${DUMP_FILE}`);
  console.error(`Run 01-fetch-en-articles.js first.`);
  process.exit(1);
}

/** Простой CSV-парсер с автодетектом разделителя и BOM. */
function parseCsv(text) {
  // 1. Удаляем UTF-8 BOM если есть (Excel его добавляет)
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // 2. Берём первую непустую строку как заголовок
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // 3. Автодетект разделителя по первой строке: что чаще, "," или ";"
  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const sep = semicolonCount > commaCount ? ";" : ",";

  console.log(
    `[CSV] detected separator: "${sep}" (commas=${commaCount}, semicolons=${semicolonCount})`,
  );

  const headers = parseLine(lines[0], sep);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], sep);
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = cells[idx] ?? ""));
    rows.push(obj);
  }
  return rows;
}

function parseLine(line, sep = ",") {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === sep) {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

/** Очистка WP-HTML от служебных классов и атрибутов. */
function cleanWpHtml(html) {
  if (!html) return "";
  return html
    // Убираем WP-классы из всех тэгов: class="wp-block-..." и подобные
    .replace(/\s+class="[^"]*"/gi, "")
    // Убираем id-атрибуты (генерятся WP)
    .replace(/\s+id="[^"]*"/gi, "")
    // Убираем data-* атрибуты
    .replace(/\s+data-[a-z-]+="[^"]*"/gi, "")
    // Убираем style="" (часто содержит inline-стили WP)
    .replace(/\s+style="[^"]*"/gi, "")
    // Убираем wp:* комментарии Gutenberg
    .replace(/<!--\s*\/?wp:[^>]*-->/g, "")
    // Лишние пустые параграфы
    .replace(/<p>\s*<\/p>/g, "")
    // Очистка лишних переносов
    .replace(/\n{3,}/g, "\n\n");
}

/** Сгенерировать excerpt из тела если редактор оставил его пустым. */
function deriveExcerpt(html, hint) {
  if (hint && hint.trim()) return hint.trim();
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 280) + (text.length > 280 ? "…" : "");
}

async function patchArticle(documentId, payload) {
  const url = `${STRAPI_URL}/api/articles/${documentId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi PUT ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function main() {
  console.log(`Mode: ${DRY ? "DRY-RUN (no writes)" : "APPLYING TO STRAPI"}`);

  const csvText = readFileSync(MAPPING_FILE, "utf-8");
  const rows = parseCsv(csvText);
  const enDump = JSON.parse(readFileSync(DUMP_FILE, "utf-8"));
  const enById = new Map(enDump.map((e) => [String(e.wp_id), e]));

  const log = [];
  let applied = 0;
  let skipped = 0;
  let errored = 0;
  let blank = 0;

  for (const row of rows) {
    const action = (row.match_action || "").trim().toUpperCase();
    if (!action) {
      blank++;
      continue;
    }

    let wpId = null;
    if (action === "APPLY") wpId = row.wp_id_suggested;
    else if (action === "ALT2") wpId = row.alt2_wp_id;
    else if (action === "ALT3") wpId = row.alt3_wp_id;
    else if (action === "SKIP") {
      skipped++;
      log.push(`SKIP    ru="${row.ru_title}"`);
      continue;
    } else if (/^\d+$/.test(action)) {
      wpId = action; // Прямое указание wp_id
    } else {
      console.warn(`Unknown match_action="${action}" for ru_id=${row.ru_id}`);
      errored++;
      continue;
    }

    if (!wpId) {
      console.warn(`No wp_id resolved for action=${action}, ru_id=${row.ru_id}`);
      errored++;
      continue;
    }

    const en = enById.get(String(wpId));
    if (!en) {
      console.warn(`wp_id=${wpId} not found in EN dump`);
      errored++;
      continue;
    }

    const cleanedContent = cleanWpHtml(en.content_html_old_en);
    const payload = {
      title_en: en.title_old_en,
      excerpt_en: deriveExcerpt(cleanedContent, en.excerpt_old_en),
      content_html_en: cleanedContent,
      is_translated_en: true,
    };

    if (DRY) {
      console.log(`DRY: would update ru_id=${row.ru_id} from wp_id=${wpId}`);
      console.log(`     RU title: ${row.ru_title.slice(0, 60)}`);
      console.log(`     EN title: ${en.title_old_en.slice(0, 60)}`);
      log.push(`DRY     ru_id=${row.ru_id} wp_id=${wpId}`);
      applied++;
    } else {
      try {
        await patchArticle(row.ru_documentId, payload);
        console.log(`✓ ru_id=${row.ru_id} updated from wp_id=${wpId}`);
        log.push(
          `OK      ru_id=${row.ru_id} ← wp_id=${wpId} (${row.ru_title.slice(0, 50)})`,
        );
        applied++;
      } catch (e) {
        console.error(`✗ ru_id=${row.ru_id}: ${e.message}`);
        log.push(`ERR     ru_id=${row.ru_id}: ${e.message}`);
        errored++;
      }
      // Маленькая пауза чтобы не перегрузить Strapi
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  writeFileSync(LOG_FILE, log.join("\n"), "utf-8");

  console.log(`\n=== Summary ===`);
  console.log(`Applied:  ${applied}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errored:  ${errored}`);
  console.log(`Blank (no action): ${blank}`);
  console.log(`Log: ${LOG_FILE}`);
  if (DRY) {
    console.log(`\nThis was DRY-RUN. To actually apply, run without --dry`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
