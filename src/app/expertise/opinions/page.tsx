import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticles } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

export default async function ExpertiseOpinionsPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const origin = getStrapiUrl();
  let articles: Article[] = [];

  try {
    const res = await getArticles({
      format: "мнение",
      pageSize: LIST_LIMIT,
      page: 1,
      locale,
    });
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin, locale));
  } catch (e) {
    console.error("[ExpertiseOpinionsPage] fetch failed:", e);
  }

  return <ArticleRubricGrid heading={dict.expertise.opinions} articles={articles} locale={locale} />;
}
