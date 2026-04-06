import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticles } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

export default async function ExpertiseColumnsPage() {
  const origin = getStrapiUrl();
  let articles: Article[] = [];

  try {
    const res = await getArticles({
      format: "колонка",
      pageSize: LIST_LIMIT,
      page: 1,
    });
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[ExpertiseColumnsPage] fetch failed:", e);
  }

  return (
    <ArticleRubricGrid heading="Авторские колонки" articles={articles} />
  );
}
