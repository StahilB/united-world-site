import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByCategory, getCategoryBySlug } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const revalidate = 300;

const LIST_LIMIT = 100;

type CategoryPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug).catch(() => null);
  if (!category) {
    return {
      title: "Категория не найдена",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: category.name,
    description: `Статьи по теме «${category.name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/category/${params.slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;
  const origin = getStrapiUrl();

  const category = await getCategoryBySlug(slug).catch(() => null);
  if (!category) {
    notFound();
  }

  let articles: Article[] = [];
  try {
    const res = await getArticlesByCategory(category.id, LIST_LIMIT);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[CategoryPage] articles fetch failed:", e);
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Главная", url: "/" },
          { name: "Категории", url: "/category" },
          { name: category.name, url: `/category/${slug}` },
        ])}
      />
      <ArticleRubricGrid
        heading={category.name}
        articles={articles}
        emptyMessage="Статьи не найдены"
      />
    </>
  );
}
