import { notFound } from "next/navigation";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByCategory, getCategoryBySlug } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

type CategoryPageProps = {
  params: { slug: string };
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;
  const origin = getStrapiUrl();

  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) {
    notFound();
  }

  let articles: Article[] = [];
  try {
    const res = await getArticlesByCategory(slug, LIST_LIMIT);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[CategoryPage] articles fetch failed:", e);
  }

  return <ArticleRubricGrid heading={category.name} articles={articles} />;
}
