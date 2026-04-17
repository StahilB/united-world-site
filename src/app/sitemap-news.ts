import type { MetadataRoute } from "next";
import { getLatestArticles } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
export const revalidate = 3600;

export default async function sitemapNews(): Promise<MetadataRoute.Sitemap> {
  const TWO_DAYS_AGO = Date.now() - 2 * 24 * 60 * 60 * 1000;

  const res = await getLatestArticles(200).catch((e) => {
    console.error("Sitemap News: error loading latest articles", e);
    return { data: [] };
  });

  const fresh = (res?.data ?? []).filter((a) => {
    const raw = a.publication_date || a.publishedAt;
    if (!raw) return false;
    const d = new Date(raw).getTime();
    return Number.isFinite(d) && d >= TWO_DAYS_AGO;
  });

  return fresh.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publication_date || article.publishedAt || Date.now()),
    changeFrequency: "hourly",
    priority: 1.0,
  }));
}
