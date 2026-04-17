import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import {
  articlesByCategoryRequestPath,
  getArticlesByCategory,
  getCategoryBySlug,
  strapiAbsoluteUrl,
} from "@/lib/api";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { StrapiArticle, StrapiCollectionResponse } from "@/lib/strapi-types";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  const path = articlesByCategoryRequestPath(category.id, LIST_LIMIT);
  const requestUrl = strapiAbsoluteUrl(path);

  let articles: Article[] = [];
  let rawCount = 0;
  let res: StrapiCollectionResponse<StrapiArticle> | null = null;

  try {
    console.log("[CategoryPage] Strapi GET (full URL):", requestUrl);
    res = await getArticlesByCategory(category.id, LIST_LIMIT);
    rawCount = res.data?.length ?? 0;
    console.log(
      "[CategoryPage] Strapi response:",
      JSON.stringify(
        {
          meta: res.meta,
          dataLength: rawCount,
          categoryFilter: {
            field: "categories.id",
            value: category.id,
            slugParam: slug,
          },
          sample: res.data?.slice(0, 2).map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            categories: a.categories,
          })),
        },
        null,
        2,
      ),
    );
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
        debug={{ requestUrl, rawCount }}
        emptyMessage="Статьи не найдены"
      />
    </>
  );
}
