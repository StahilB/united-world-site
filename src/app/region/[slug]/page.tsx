import { notFound } from "next/navigation";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByRegion, getRegionBySlug } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

type RegionPageProps = {
  params: { slug: string };
};

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = params;
  const origin = getStrapiUrl();

  const region = await getRegionBySlug(slug).catch(() => null);
  if (!region) {
    notFound();
  }

  let articles: Article[] = [];
  try {
    const res = await getArticlesByRegion(slug, LIST_LIMIT);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[RegionPage] articles fetch failed:", e);
  }

  return <ArticleRubricGrid heading={region.name} articles={articles} />;
}
