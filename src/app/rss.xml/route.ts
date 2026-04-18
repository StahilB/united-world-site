import { NextResponse } from "next/server";
import { getLatestArticles } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const revalidate = 3600;

export async function GET() {
  let items = "";
  try {
    const res = await getLatestArticles(30);
    for (const a of res.data ?? []) {
      if (!a?.slug) continue;
      const link = `${SITE_URL.replace(/\/$/, "")}/articles/${a.slug}`;
      const rawDate = a.publication_date || a.publishedAt || a.createdAt;
      const pubDate = rawDate ? new Date(rawDate).toUTCString() : "";
      const desc = escapeXml((a.excerpt ?? "").slice(0, 500));
      items += `<item>
<title>${escapeXml(a.title ?? "")}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
<description>${desc}</description>
</item>`;
    }
  } catch {
    // пустой channel если Strapi недоступен
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Единый Мир</title>
<link>${SITE_URL}</link>
<description>Аналитический центр общественной дипломатии</description>
<language>ru-RU</language>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
