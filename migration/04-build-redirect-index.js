import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error("Set STRAPI_URL and STRAPI_TOKEN in .env");
  process.exit(1);
}

const OUT = "../public/wp-redirects.json";

async function fetchActualSlug(documentId) {
  // Запрашиваем АКТУАЛЬНЫЙ slug в Strapi по documentId
  const url = `${STRAPI_URL}/api/articles/${documentId}?fields[0]=slug`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.slug ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const src = JSON.parse(
    readFileSync("output/url-mapping.json", "utf-8"),
  );
  const mapping = src.mapping ?? [];
  console.log(`Loaded ${mapping.length} mapping entries`);

  const result = [];
  for (let i = 0; i < mapping.length; i++) {
    const m = mapping[i];
    const slug = await fetchActualSlug(m.strapi_document_id);
    if (!slug) {
      console.warn(`No slug for documentId=${m.strapi_document_id} (wp_id=${m.wp_id})`);
      continue;
    }
    // Декодируем old_path в нормальный русский для второго ключа
    let decoded = "";
    try {
      decoded = decodeURIComponent(m.old_path).replace(/\/$/, "");
    } catch {}
    result.push({
      wp_id: m.wp_id,
      old_path: m.old_path.replace(/\/$/, ""),
      old_path_decoded: decoded,
      new_slug: slug,
    });
    if (i % 10 === 0) {
      console.log(`  processed ${i}/${mapping.length}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n✅ Wrote ${result.length} entries to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
