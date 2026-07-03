import { ExpertForumBlock } from "@/components/blocks/ExpertForumBlock";
import { HeroTopBlock } from "@/components/blocks/HeroTopBlock";
import { LatestArticlesBlock } from "@/components/blocks/LatestArticlesBlock";
import { RegionalReviewsBlock } from "@/components/blocks/RegionalReviewsBlock";
import { ThematicBlock } from "@/components/blocks/ThematicBlock";
import Link from "next/link";
import {
  getArticles,
  getLatestArticles,
  getPopularArticles,
  getRecentPopularArticles,
  getRegions,
} from "@/lib/api";
import {
  buildRegionalReviewItems,
  mapStrapiArticleToArticle,
  toExpertInterviews,
  toExpertOpinions,
  toGlobalReviewsMainArticle,
  toGlobalReviewsPopularArticle,
} from "@/lib/strapi-mappers";
import type {
  StrapiArticle,
  StrapiCollectionResponse,
  StrapiRegion,
} from "@/lib/strapi-types";
import type { GlobalReviewsMainArticle } from "@/lib/types";
import { getStrapiUrl } from "@/lib/strapi-config";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Locale = 'ru' | 'en';

export const revalidate = 300;

const emptyArticles: StrapiCollectionResponse<StrapiArticle> = { data: [] };
const emptyRegions: StrapiCollectionResponse<StrapiRegion> = { data: [] };

export default async function HomePage() {
  const currentLocale = await getServerLocale();
  const localeForApi = currentLocale as Locale;
  
  const dict = getDictionary(localeForApi);
  const origin = getStrapiUrl();

  let latestRes = emptyArticles;
  let popularRes = emptyArticles;
  let poolRes = emptyArticles;
  let regionsRes = emptyRegions;

  try {
    const results = await Promise.all([
      getLatestArticles(4, localeForApi),
      getRecentPopularArticles(7, 30, localeForApi),
      getArticles({ pageSize: 200, page: 1, locale: localeForApi }),
      getRegions(),
    ]);
    latestRes = results[0];
    popularRes = results[1];
    poolRes = results[2];
    regionsRes = results[3];
  } catch (e) {
    console.error("[HomePage] Strapi fetch failed:", e);
  }

  const latestArticles = latestRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin, localeForApi),
  );

  const poolMapped = poolRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin, localeForApi),
  );

  const mainArticle: GlobalReviewsMainArticle | null = popularRes.data[0]
    ? toGlobalReviewsMainArticle(popularRes.data[0], origin, localeForApi)
    : null;

  const popularArticles = popularRes.data.slice(1).map((a) =>
    toGlobalReviewsPopularArticle(a, localeForApi),
  );

  const regionalItems = buildRegionalReviewItems(
    regionsRes.data,
    poolRes.data,
    origin,
    localeForApi,
  );

  const expertOpinions = toExpertOpinions(poolMapped, 6, localeForApi);
  const expertInterviews = toExpertInterviews(poolMapped, 3, localeForApi);

  return (
    <main className="flex min-h-screen flex-col">
      <nav aria-label="Main menu" className="sr-only">
        <Link href="/section/analitika">{dict.header.navAnalytics}</Link>
        <Link href="/expertise">{dict.header.navExpertise}</Link>
        <Link href="/about">{dict.header.navAbout}</Link>
      </nav>

      {mainArticle && (
        <HeroTopBlock
          mainArticle={mainArticle}
          popularArticles={popularArticles}
          locale={localeForApi}
        />
      )}

      {latestArticles.length > 0 && <LatestArticlesBlock articles={latestArticles} locale={localeForApi} />}
      {regionalItems.length > 0 && <RegionalReviewsBlock items={regionalItems} locale={localeForApi} />}
      
      {(expertOpinions.length > 0 || expertInterviews.length > 0) && (
        <ExpertForumBlock
          opinions={expertOpinions}
          interviews={expertInterviews}
          locale={localeForApi}
        />
      )}
    </main>
  );
}