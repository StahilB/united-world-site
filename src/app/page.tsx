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
import { THEMATIC_BLOCK_THEMES } from "@/lib/thematic-block";
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
  let fetchFailed = false;

  try {
    const results = await Promise.all([
      getLatestArticles(4),
      getRecentPopularArticles(7, 90),
      getArticles({ pageSize: 100, page: 1 }),
      getRegions(),
    ]);
    latestRes = results[0];
    popularRes = results[1];
    poolRes = results[2];
    regionsRes = results[3];

    if (popularRes.data.length < 5) {
      try {
        const fallback = await getPopularArticles(7);
        if (fallback.data.length > popularRes.data.length) {
          popularRes = fallback;
        }
      } catch {
        // игнорируем — используем то, что есть
      }
    }
  } catch (e) {
    console.error("[HomePage] Strapi fetch failed:", e);
    fetchFailed = true;
  }

  if (
    fetchFailed &&
    popularRes.data.length === 0 &&
    latestRes.data.length === 0
  ) {
    return (
      <main className="flex min-h-screen flex-col">
        <section className="bg-paper-warm section-home">
          <div className="container-site">
            <p className="kicker">Загрузка материалов</p>
            <h1 className="h-display mt-4">
              Аналитические материалы обновляются
            </h1>
            <p className="mt-6 lead max-w-xl">
              Контент будет доступен через несколько секунд. Если страница
              не загружается дольше, напишите нам на{" "}
              <a
                href="mailto:official@anounitedworld.com"
                className="underline decoration-gold-deep/40 underline-offset-2 hover:text-gold-deep"
              >
                official@anounitedworld.com
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    );
  }

  let thematicItems: ThematicBlockItem[] = [];
  const thematicResponses = await Promise.allSettled(
    THEMATIC_BLOCK_THEMES.map((theme) =>
      getArticles({
        category: theme.slug,
        pageSize: 1,
        page: 1,
      }),
    ),
  );
  const collected: ThematicBlockItem[] = [];
  THEMATIC_BLOCK_THEMES.forEach((theme, i) => {
    const result = thematicResponses[i];
    if (!result || result.status !== "fulfilled") {
      if (result?.status === "rejected") {
        console.error(
          `[HomePage] thematic fetch failed for ${theme.slug}:`,
          result.reason,
        );
      }
      return;
    }
    const raw = result.value?.data?.[0];
    if (!raw) return;
    const a = mapStrapiArticleToArticle(raw, origin);
    collected.push({
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
    });
  });
  thematicItems = collected;

  const latestArticles = latestRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const poolMapped = poolRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const mainArticle: GlobalReviewsMainArticle | null = popularRes.data[0]
    ? toGlobalReviewsMainArticle(popularRes.data[0], origin)
    : null;

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
  const hasLatest = latestArticles.length > 0;
  const hasRegional = regionsRes.data.length > 0 && regionalItems.length > 0;
  const hasThematic = thematicItems.length > 0;
  const hasExpert = expertOpinions.length > 0 || expertInterviews.length > 0;

  return (
    <main className="flex min-h-screen flex-col">
      <nav aria-label="Главное меню" className="sr-only">
        <Link href="/section/analitika">Аналитика</Link>
        <Link href="/expertise">Экспертиза</Link>
        <Link href="/about">О центре</Link>
      </nav>

      {mainArticle && (
        <HeroTopBlock
          mainArticle={mainArticle}
          popularArticles={popularArticles}
        />
      )}

      {hasLatest && <LatestArticlesBlock articles={latestArticles} />}

      {hasRegional && <RegionalReviewsBlock items={regionalItems} />}

      {hasThematic && <ThematicBlock items={thematicItems} />}

      {hasExpert && (
        <ExpertForumBlock
          opinions={expertOpinions}
          interviews={expertInterviews}
        />
      )}
    </main>
  );
}
