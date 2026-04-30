import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { getArticlesByRegion, getRegionBySlug } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 300;

const LIST_LIMIT = 100;

type RegionPageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  const region = await getRegionBySlug(params.slug).catch(() => null);
  if (!region) {
    return {
      title: locale === "en" ? "Region not found" : "Регион не найден",
      robots: { index: false, follow: false },
    };
  }
  const name =
    locale === "en" && (region as any).name_en
      ? (region as any).name_en
      : region.name;

  return {
    title: name,
    description:
      locale === "en"
        ? `Articles for region "${name}" — United World analytical center.`
        : `Статьи по региону «${name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/region/${params.slug}` },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const { slug } = params;
  const origin = getStrapiUrl();

  const region = await getRegionBySlug(slug).catch(() => null);
  if (!region) {
    notFound();
  }
  const regionName =
    locale === "en" && (region as any).name_en
      ? (region as any).name_en
      : region.name;

  let articles: Article[] = [];
  try {
    const res = await getArticlesByRegion(region.id, LIST_LIMIT, locale);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin, locale));
  } catch (e) {
    console.error("[RegionPage] articles fetch failed:", e);
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: dict.common.breadcrumbHome, url: locale === "en" ? "/en" : "/" },
          { name: regionName, url: `/region/${slug}` },
        ])}
      />
      <ArticleRubricGrid
        heading={regionName}
        articles={articles}
        emptyMessage={dict.rubric.emptyMessage}
        locale={locale}
      />
    </>
  );
}
