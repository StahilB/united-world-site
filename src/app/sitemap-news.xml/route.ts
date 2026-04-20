import { getLatestArticles } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
const NEWS_NAME = "Единый Мир";
const NEWS_LANG = "ru";
export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(): Promise<Response> {
  const TWO_DAYS_AGO = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const res = await getLatestArticles(200).catch((e) => {
    console.error("News XML sitemap: error loading latest articles", e);
    return { data: [] };
  });

  const items = (res?.data ?? []).filter((article) => {
    const raw = article.publication_date || article.publishedAt;
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) && ts >= TWO_DAYS_AGO;
  });

  // Если за последние 2 дня нет статей — Google News не обходит этот
  // sitemap и не ожидает там записей. Но отдавать пустой <urlset> без
  // <url> нельзя — валидатор жалуется "Missing XML tag: url". Решение:
  // когда items пусты, отдаём 404 (Google воспримет как "sitemap пока
  // недоступен") вместо битого XML.
  if (items.length === 0) {
    return new Response("News sitemap is empty (no articles in the last 48 hours)", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const body = items
    .map((article) => {
      const publicationDate = article.publication_date || article.publishedAt || new Date().toISOString();
      return [
        "<url>",
        `<loc>${escapeXml(`${SITE_URL}/articles/${article.slug}`)}</loc>`,
        "<news:news>",
        "<news:publication>",
        `<news:name>${escapeXml(NEWS_NAME)}</news:name>`,
        `<news:language>${NEWS_LANG}</news:language>`,
        "</news:publication>",
        `<news:publication_date>${escapeXml(publicationDate)}</news:publication_date>`,
        `<news:title>${escapeXml(article.title)}</news:title>`,
        "</news:news>",
        "</url>",
      ].join("");
    })
    .join("");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' +
    body +
    "</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
