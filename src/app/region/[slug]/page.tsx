import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import {
  articlesByRegionRequestPath,
  getArticlesByRegion,
  getRegionBySlug,
  strapiAbsoluteUrl,
} from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { StrapiCollectionResponse, StrapiArticle } from "@/lib/strapi-types";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  const path = articlesByRegionRequestPath(region.id, LIST_LIMIT);
  const requestUrl = strapiAbsoluteUrl(path);

  let articles: Article[] = [];
  let rawCount = 0;
  let res: StrapiCollectionResponse<StrapiArticle> | null = null;

  try {
    console.log("[RegionPage] Strapi GET (full URL):", requestUrl);
    res = await getArticlesByRegion(region.id, LIST_LIMIT);
    rawCount = res.data?.length ?? 0;
    console.log(
      "[RegionPage] Strapi response:",
      JSON.stringify(
        {
          meta: res.meta,
          dataLength: rawCount,
          regionFilter: { field: "region.id", value: region.id, slugParam: slug },
          sample: res.data?.slice(0, 2).map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            region: a.region,
          })),
        },
        null,
        2,
      ),
    );
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[RegionPage] articles fetch failed:", e);
  }

  return (
    <ArticleRubricGrid
      heading={region.name}
      articles={articles}
      debug={{ requestUrl, rawCount }}
      emptyMessage="Статьи не найдены"
    />
  );
}
