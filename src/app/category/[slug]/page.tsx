import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByCategory, getCategoryBySlug } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 300;

const LIST_LIMIT = 100;

type CategoryPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  const category = await getCategoryBySlug(params.slug).catch(() => null);
  if (!category) {
    return {
      title: locale === "en" ? "Category not found" : "Категория не найдена",
      robots: { index: false, follow: false },
    };
  }
  const name =
    locale === "en" && (category as any).name_en
      ? (category as any).name_en
      : category.name;

  return {
    title: name,
    description:
      locale === "en"
        ? `Articles in "${name}" — United World analytical center.`
        : `Статьи по теме «${name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/category/${params.slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const { slug } = params;
  const origin = getStrapiUrl();

  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) {
    notFound();
  }
  const categoryName =
    locale === "en" && (category as any).name_en
      ? (category as any).name_en
      : category.name;

  let articles: Article[] = [];
  try {
    const res = await getArticlesByCategory(category.id, LIST_LIMIT, locale);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin, locale));
  } catch (e) {
    console.error("[CategoryPage] articles fetch failed:", e);
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: dict.common.breadcrumbHome, url: locale === "en" ? "/en" : "/" },
          { name: categoryName, url: `/category/${slug}` },
        ])}
      />
      <ArticleRubricGrid
        heading={categoryName}
        articles={articles}
        emptyMessage={dict.rubric.emptyMessage}
        locale={locale}
      />
    </>
  );
}
