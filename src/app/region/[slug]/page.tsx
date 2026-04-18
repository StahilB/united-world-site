import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByRegion, getRegionBySlug } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const revalidate = 300;

const LIST_LIMIT = 100;

type RegionPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const region = await getRegionBySlug(params.slug).catch(() => null);
  if (!region) {
    return {
      title: "Регион не найден",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: region.name,
    description: `Статьи по региону «${region.name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/region/${params.slug}` },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = params;
  const origin = getStrapiUrl();

  const region = await getRegionBySlug(slug).catch(() => null);
  if (!region) {
    notFound();
  }

  let articles: Article[] = [];
  try {
    const res = await getArticlesByRegion(region.id, LIST_LIMIT);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[RegionPage] articles fetch failed:", e);
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Главная", url: "/" },
          { name: "Регионы", url: "/region" },
          { name: region.name, url: `/region/${slug}` },
        ])}
      />
      <ArticleRubricGrid
        heading={region.name}
        articles={articles}
        emptyMessage="Статьи не найдены"
      />
    </>
  );
}
