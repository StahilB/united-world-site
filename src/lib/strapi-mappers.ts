import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiMedia,
  StrapiRegion,
  StrapiSection,
} from "./strapi-types";
import type {
  Article,
  Author,
  Category,
  ExpertForumInterview,
  ExpertForumOpinion,
  GlobalReviewsMainArticle,
  GlobalReviewsPopularArticle,
  Region,
  RegionalReviewItem,
  ThematicBlockItem,
} from "./types";
import { getStrapiUrl, resolveStrapiAssetUrl } from "./strapi-config";

const FALLBACK_COVER =
  "https://picsum.photos/seed/united-world/1200/800";

function mediaUrl(media: StrapiMedia | null | undefined): string {
  if (!media?.url) {
    return FALLBACK_COVER;
  }
  return resolveStrapiAssetUrl(media.url);
}

function authorPhotoUrl(media: StrapiMedia | null | undefined): string {
  if (!media?.url) {
    return "";
  }
  return resolveStrapiAssetUrl(media.url);
}

function authorFromStrapi(a: StrapiAuthor | null | undefined): Author {
  if (!a) {
    return {
      id: "0",
      name: "Редакция",
      slug: "editorial",
      bio: "",
      avatarUrl: "",
    };
  }
  return {
    id: String(a.id),
    name: a.name,
    slug: a.slug,
    bio: a.bio ?? "",
    avatarUrl: authorPhotoUrl(a.photo ?? undefined),
  };
}

function categoryFromStrapi(c: StrapiCategory): Category {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    color: c.color ?? "#14213D",
  };
}

function regionFromStrapi(r: StrapiRegion | null | undefined): Region {
  if (!r) {
    return {
      id: "0",
      name: "—",
      slug: "unknown",
    };
  }
  return {
    id: String(r.id),
    name: r.name,
    slug: r.slug,
  };
}

function publishedIso(a: StrapiArticle): string {
  const raw =
    a.publication_date ?? a.publishedAt ?? a.createdAt ?? new Date().toISOString();
  return typeof raw === "string" ? raw : new Date().toISOString();
}

/** Map Strapi article to UI `Article` (for blocks and cards). */
export function mapStrapiArticleToArticle(
  a: StrapiArticle,
  /** @deprecated Unused; media URLs use getPublicStrapiUrl(). Kept for call-site compatibility. */
  _origin: string = getStrapiUrl(),
): Article {
  const cats = (a.categories ?? [])
    .filter(Boolean)
    .map((c) => categoryFromStrapi(c as StrapiCategory));

  const sections = (a.sections ?? [])
    .filter(Boolean)
    .map((s) => {
      const x = s as StrapiSection;
      return { name: x.name, slug: x.slug };
    });

  return {
    id: String(a.id),
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? "",
    coverImage: mediaUrl(a.cover_image ?? undefined),
    author: authorFromStrapi(a.author),
    categories: cats,
    sections: sections.length > 0 ? sections : undefined,
    region: regionFromStrapi(a.region),
    format: a.format ?? "анализ",
    publishedAt: publishedIso(a),
    viewsCount: a.views_count ?? 0,
    readingTime: a.reading_time ?? 0,
  };
}

export function formatDateRu(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function toGlobalReviewsMainArticle(
  a: StrapiArticle,
  origin: string = getStrapiUrl(),
): GlobalReviewsMainArticle {
  const mapped = mapStrapiArticleToArticle(a, origin);
  const iso = publishedIso(a);
  const hasRealCover = Boolean(a.cover_image?.url);
  return {
    title: mapped.title,
    excerpt: mapped.excerpt ?? "",
    date: formatDateRu(iso),
    dateIso: iso.slice(0, 10),
    href: `/articles/${mapped.slug}`,
    ...(hasRealCover ? { coverImage: mapped.coverImage } : {}),
  };
}

export function toGlobalReviewsPopularArticle(
  a: StrapiArticle,
): GlobalReviewsPopularArticle {
  return {
    title: a.title,
    href: `/articles/${a.slug}`,
  };
}

export function toExpertOpinions(
  articles: Article[],
  limit = 6,
): ExpertForumOpinion[] {
  return articles
    .filter((x) => /мнение/i.test(x.format))
    .slice(0, limit)
    .map((a) => ({
      title: a.title,
      href: `/articles/${a.slug}`,
      author: {
        name: a.author.name,
        avatarUrl: a.author.avatarUrl,
      },
    }));
}

export function toExpertInterviews(
  articles: Article[],
  limit = 3,
): ExpertForumInterview[] {
  return articles
    .filter((x) => /интервью/i.test(x.format))
    .slice(0, limit)
    .map((a) => ({
      title: a.title,
      href: `/articles/${a.slug}`,
      coverImage: a.coverImage,
    }));
}

/** One latest article per region (first match wins by list order). */
export function buildRegionalReviewItems(
  regions: StrapiRegion[],
  articles: StrapiArticle[],
  origin: string = getStrapiUrl(),
): RegionalReviewItem[] {
  const mapped = articles.map((x) => mapStrapiArticleToArticle(x, origin));
  return regions.map((region) => {
    const article =
      mapped.find((ar) => ar.region.slug === region.slug) ?? mapped[0];
    if (!article) {
      return {
        region: { name: region.name, slug: region.slug },
        article: {
          title: "Материалы скоро",
          slug: region.slug,
          coverImage: mediaUrl(region.cover_image ?? undefined),
        },
      };
    }
    return {
      region: { name: region.name, slug: region.slug },
      article: {
        title: article.title,
        slug: article.slug,
        coverImage: article.coverImage,
      },
    };
  });
}

/** One latest article per category slug. */
export function buildThematicBlockItems(
  categories: StrapiCategory[],
  articles: StrapiArticle[],
  origin: string = getStrapiUrl(),
): ThematicBlockItem[] {
  const mapped = articles.map((x) => mapStrapiArticleToArticle(x, origin));
  return categories.map((cat) => {
    const article =
      mapped.find((ar) => ar.categories.some((c) => c.slug === cat.slug)) ??
      mapped[0];
    const color = cat.color ?? "#14213D";
    if (!article) {
      return {
        category: { name: cat.name, slug: cat.slug, color },
        article: {
          title: "Материалы скоро",
          slug: cat.slug,
          coverImage: FALLBACK_COVER,
          format: "—",
        },
      };
    }
    return {
      category: {
        name: cat.name,
        slug: cat.slug,
        color,
      },
      article: {
        title: article.title,
        slug: article.slug,
        coverImage: article.coverImage,
        format: article.format,
      },
    };
  });
}
