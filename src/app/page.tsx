import { ExpertForumBlock } from "@/components/blocks/ExpertForumBlock";
import { GlobalReviewsBlock } from "@/components/blocks/GlobalReviewsBlock";
import { LatestArticlesBlock } from "@/components/blocks/LatestArticlesBlock";
import { RegionalReviewsBlock } from "@/components/blocks/RegionalReviewsBlock";
import { ThematicBlock } from "@/components/blocks/ThematicBlock";
import {
  getArticles,
  getCategories,
  getGlobalReview,
  getLatestArticles,
  getPopularArticles,
  getRegions,
} from "@/lib/api";
import {
  buildRegionalReviewItems,
  buildThematicBlockItems,
  formatDateRu,
  mapStrapiArticleToArticle,
  toExpertInterviews,
  toExpertOpinions,
  toGlobalReviewsMainArticle,
  toGlobalReviewsPopularArticle,
} from "@/lib/strapi-mappers";
import type {
  StrapiArticle,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiRegion,
} from "@/lib/strapi-types";
import type { GlobalReviewsMainArticle } from "@/lib/types";
import { getStrapiUrl } from "@/lib/strapi-config";

/** No static fetch to Strapi at build time (CMS may be down). */
export const dynamic = "force-dynamic";

const emptyArticles: StrapiCollectionResponse<StrapiArticle> = { data: [] };
const emptyRegions: StrapiCollectionResponse<StrapiRegion> = { data: [] };
const emptyCategories: StrapiCollectionResponse<StrapiCategory> = { data: [] };

export default async function HomePage() {
  const origin = getStrapiUrl();

  let latestRes = emptyArticles;
  let popularRes = emptyArticles;
  let poolRes = emptyArticles;
  let regionsRes = emptyRegions;
  let categoriesRes = emptyCategories;

  try {
    const results = await Promise.all([
      getLatestArticles(4),
      getPopularArticles(7),
      getArticles({ pageSize: 100, page: 1 }),
      getRegions(),
      getCategories(),
    ]);
    latestRes = results[0];
    popularRes = results[1];
    poolRes = results[2];
    regionsRes = results[3];
    categoriesRes = results[4];
  } catch (e) {
    console.error("[HomePage] Strapi fetch failed:", e);
  }

  let featured: StrapiArticle | null = null;
  try {
    const gr = await getGlobalReview();
    featured = gr.data?.featured_article ?? null;
  } catch {
    featured = null;
  }

  const latestArticles = latestRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const poolMapped = poolRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const mainArticle: GlobalReviewsMainArticle = featured
    ? toGlobalReviewsMainArticle(featured, origin)
    : latestRes.data[0]
      ? toGlobalReviewsMainArticle(latestRes.data[0], origin)
      : {
          title: "Материалы появятся в ближайшее время",
          excerpt:
            "Добавьте статьи в Strapi или проверьте NEXT_PUBLIC_STRAPI_URL и доступность API.",
          date: formatDateRu(new Date().toISOString()),
          dateIso: new Date().toISOString().slice(0, 10),
          href: "/",
        };

  const popularArticles = popularRes.data.map((a) =>
    toGlobalReviewsPopularArticle(a),
  );

  const regionalItems = buildRegionalReviewItems(
    regionsRes.data,
    poolRes.data,
    origin,
  );

  const thematicItems = buildThematicBlockItems(
    categoriesRes.data,
    poolRes.data,
    origin,
  );

  const expertOpinions = toExpertOpinions(poolMapped);
  const expertInterviews = toExpertInterviews(poolMapped);

  return (
    <main className="flex min-h-screen flex-col">
      <section className="py-12 md:py-16">
        <GlobalReviewsBlock
          mainArticle={mainArticle}
          popularArticles={popularArticles}
        />
      </section>

      <section className="py-12 md:py-16">
        <LatestArticlesBlock articles={latestArticles} />
      </section>

      <section className="py-12 md:py-16">
        <RegionalReviewsBlock items={regionalItems} />
      </section>

      <section className="py-12 md:py-16">
        <ThematicBlock items={thematicItems} />
      </section>

      <section className="py-12 md:py-16">
        <ExpertForumBlock
          opinions={expertOpinions}
          interviews={expertInterviews}
        />
      </section>
    </main>
  );
}
