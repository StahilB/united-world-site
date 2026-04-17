import type { MetadataRoute } from "next";
import type { Section } from "@/lib/api";
import { getArticles, getAuthors, getSections } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
export const revalidate = 3600;

function flattenSections(sections: Section[]): Section[] {
  const out: Section[] = [];
  const queue = [...sections];
  while (queue.length > 0) {
    const section = queue.shift();
    if (!section) continue;
    out.push(section);
    queue.push(...section.children);
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/team`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${SITE_URL}/cooperation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contacts`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${SITE_URL}/news`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  const articleUrls: MetadataRoute.Sitemap = [];
  try {
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      const res = await getArticles({ page, pageSize: 100 });
      const items = res?.data ?? [];

      for (const article of items) {
        const rawDate = article.updatedAt || article.publication_date || article.publishedAt;
        articleUrls.push({
          url: `${SITE_URL}/articles/${article.slug}`,
          lastModified: rawDate ? new Date(rawDate) : now,
          changeFrequency: "weekly",
          priority: 0.9,
        });
      }

      const total = res?.meta?.pagination?.total ?? items.length;
      hasMore = articleUrls.length < total && items.length > 0;
      page += 1;
    }
  } catch (e) {
    console.error("Sitemap: error loading articles", e);
  }

  const sectionUrls: MetadataRoute.Sitemap = [];
  try {
    const tree = await getSections(false);
    const sections = flattenSections(tree);
    for (const section of sections) {
      sectionUrls.push({
        url: `${SITE_URL}/section/${section.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch (e) {
    console.error("Sitemap: error loading sections", e);
  }

  const authorUrls: MetadataRoute.Sitemap = [];
  try {
    const res = await getAuthors();
    for (const author of res?.data ?? []) {
      authorUrls.push({
        url: `${SITE_URL}/author/${author.slug}`,
        lastModified: author.updatedAt ? new Date(author.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (e) {
    console.error("Sitemap: error loading authors", e);
  }

  return [...staticPages, ...articleUrls, ...sectionUrls, ...authorUrls];
}
