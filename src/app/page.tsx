import { ExpertForumBlock } from "@/components/blocks/ExpertForumBlock";
import { GlobalReviewsBlock } from "@/components/blocks/GlobalReviewsBlock";
import { LatestArticlesBlock } from "@/components/blocks/LatestArticlesBlock";
import { RegionalReviewsBlock } from "@/components/blocks/RegionalReviewsBlock";
import { ThematicBlock } from "@/components/blocks/ThematicBlock";
import Link from "next/link";
import {
  getArticles,
  getLatestArticles,
  getPopularArticles,
  getRegions,
} from "@/lib/api";
import { THEMATIC_BLOCK_THEMES } from "@/lib/thematic-block";
import {
  buildRegionalReviewItems,
  formatDateRu,
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
import type { GlobalReviewsMainArticle, ThematicBlockItem } from "@/lib/types";
import { getStrapiUrl } from "@/lib/strapi-config";

export const revalidate = 300;

const emptyArticles: StrapiCollectionResponse<StrapiArticle> = { data: [] };
const emptyRegions: StrapiCollectionResponse<StrapiRegion> = { data: [] };
export default async function HomePage() {
  const origin = getStrapiUrl();

  let latestRes = emptyArticles;
  let popularRes = emptyArticles;
  let poolRes = emptyArticles;
  let regionsRes = emptyRegions;

  try {
    const results = await Promise.all([
      getLatestArticles(4),
      getPopularArticles(7),
      getArticles({ pageSize: 100, page: 1 }),
      getRegions(),
    ]);
    latestRes = results[0];
    popularRes = results[1];
    poolRes = results[2];
    regionsRes = results[3];
  } catch (e) {
    console.error("[HomePage] Strapi fetch failed:", e);
  }

  const PLACEHOLDER_COVER =
    "https://picsum.photos/seed/united-world/1200/800";

  let thematicItems: ThematicBlockItem[] = [];
  try {
    const thematicResponses = await Promise.all(
      THEMATIC_BLOCK_THEMES.map((theme) =>
        getArticles({
          category: theme.slug,
          pageSize: 1,
          page: 1,
        }),
      ),
    );
    thematicItems = THEMATIC_BLOCK_THEMES.map((theme, i) => {
      const raw = thematicResponses[i]?.data?.[0];
      if (!raw) {
        return {
          category: {
            name: theme.name,
            slug: theme.slug,
            color: theme.color,
          },
          article: {
            title: "Материалы скоро",
            slug: theme.slug,
            coverImage: PLACEHOLDER_COVER,
            format: "—",
          },
        };
      }
      const a = mapStrapiArticleToArticle(raw, origin);
      return {
        category: {
          name: theme.name,
          slug: theme.slug,
          color: theme.color,
        },
        article: {
          title: a.title,
          slug: a.slug,
          coverImage: a.coverImage,
          format: a.format,
        },
      };
    });
  } catch (e) {
    console.error("[HomePage] thematic block fetch failed:", e);
    thematicItems = THEMATIC_BLOCK_THEMES.map((theme) => ({
      category: {
        name: theme.name,
        slug: theme.slug,
        color: theme.color,
      },
      article: {
        title: "Материалы скоро",
        slug: theme.slug,
        coverImage: PLACEHOLDER_COVER,
        format: "—",
      },
    }));
  }

  const latestArticles = latestRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const poolMapped = poolRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const mainArticle: GlobalReviewsMainArticle = popularRes.data[0]
    ? toGlobalReviewsMainArticle(popularRes.data[0], origin)
    : {
        title: "Материалы появятся в ближайшее время",
        excerpt: "Добавьте статьи в Strapi.",
        date: formatDateRu(new Date().toISOString()),
        dateIso: new Date().toISOString().slice(0, 10),
        href: "/",
      };

  const popularArticles = popularRes.data.slice(1).map((a) =>
    toGlobalReviewsPopularArticle(a),
  );

  const globalReviewArticles = poolRes.data.filter(
    (a) => a.is_global_review === true,
  );
  const regionalItems = buildRegionalReviewItems(
    regionsRes.data,
    globalReviewArticles.length > 0 ? globalReviewArticles : poolRes.data,
    origin,
  );

  const expertOpinions = toExpertOpinions(poolMapped);
  const expertInterviews = toExpertInterviews(poolMapped);

  return (
    <main className="flex min-h-screen flex-col">
      <nav aria-label="Главное меню" className="sr-only">
        <Link href="/analytics">Аналитика</Link>
        <Link href="/expertise">Экспертиза</Link>
        <Link href="/about">О центре</Link>
      </nav>
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
