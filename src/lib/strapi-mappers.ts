import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiMedia,
  StrapiRegion,
  StrapiSection,
} from "./strapi-types";
import type { Locale } from "./i18n/types";
import { localizeHref } from "./i18n/types";
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

const FALLBACK_COVER = "/images/placeholder-cover.svg";

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

/**
 * Универсальный выбор локализованного значения с fallback на ru.
 * Используется для name_en, description_en и подобных СПРАВОЧНЫХ полей.
 *
 * Для статей (title_en, content_html_en) НЕ используем fallback —
 * там отдельная логика через is_translated_en (см. фильтрацию
 * в Phase 3b/3c).
 */
function pickLocalized(
  ruValue: string | null | undefined,
  enValue: string | null | undefined,
  locale: Locale,
  fallback: string = "",
): string {
  if (locale === "en") {
    if (enValue && enValue.trim()) return enValue;
    // fallback на ru — лучше показать кириллицу чем пустоту
    return ruValue ?? fallback;
  }
  return ruValue ?? fallback;
}

function authorFromStrapi(
  a: StrapiAuthor | null | undefined,
  locale: Locale = "ru",
): Author {
  if (!a) {
    return {
      id: "0",
      name: locale === "en" ? "Editorial" : "Редакция",
      slug: "editorial",
      bio: "",
      avatarUrl: "",
    };
  }
  return {
    id: String(a.id),
    name: pickLocalized(a.name, a.name_en, locale, a.name),
    slug: a.slug,
    bio: pickLocalized(a.bio, a.bio_en, locale, ""),
    avatarUrl: authorPhotoUrl(a.photo ?? undefined),
  };
}

function categoryFromStrapi(c: StrapiCategory, locale: Locale = "ru"): Category {
  return {
    id: String(c.id),
    name: pickLocalized(c.name, c.name_en, locale, c.name),
    slug: c.slug,
    description: pickLocalized(c.description, c.description_en, locale, "") || undefined,
    color: c.color ?? "#14213D",
  };
}

function regionFromStrapi(
  r: StrapiRegion | null | undefined,
  locale: Locale = "ru",
): Region {
  if (!r) {
    return {
      id: "0",
      name: locale === "en" ? "—" : "—",
      slug: "unknown",
    };
  }
  return {
    id: String(r.id),
    name: pickLocalized(r.name, r.name_en, locale, r.name),
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
  locale: Locale = "ru",
): Article {
  const cats = (a.categories ?? [])
    .filter(Boolean)
    .map((c) => categoryFromStrapi(c as StrapiCategory, locale));

  const sections = (a.sections ?? [])
    .filter(Boolean)
    .map((s) => {
      const x = s as StrapiSection;
      return {
        name: pickLocalized(x.name, x.name_en, locale, x.name),
        slug: x.slug,
      };
    });

  const title =
    locale === "en" && a.title_en && a.title_en.trim()
      ? a.title_en
      : a.title;
  const excerpt =
    locale === "en" && a.excerpt_en && a.excerpt_en.trim()
      ? a.excerpt_en
      : a.excerpt ?? "";

  return {
    id: String(a.id),
    title,
    slug: a.slug,
    excerpt,
    coverImage: mediaUrl(a.cover_image ?? undefined),
    author: authorFromStrapi(a.author, locale),
    categories: cats,
    sections: sections.length > 0 ? sections : undefined,
    region: regionFromStrapi(a.region, locale),
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

export function formatDate(iso: string, locale: Locale = "ru"): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
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
  locale: Locale = "ru",
): GlobalReviewsMainArticle {
  const mapped = mapStrapiArticleToArticle(a, origin, locale);
  const iso = publishedIso(a);
  const hasRealCover = Boolean(a.cover_image?.url);
  return {
    title: mapped.title,
    excerpt: mapped.excerpt ?? "",
    date: formatDate(iso, locale),
    dateIso: iso.slice(0, 10),
    href: localizeHref(`/articles/${mapped.slug}`, locale),
    ...(hasRealCover ? { coverImage: mapped.coverImage } : {}),
  };
}

export function toGlobalReviewsPopularArticle(
  a: StrapiArticle,
  locale: Locale = "ru",
): GlobalReviewsPopularArticle {
  const title =
    locale === "en" && a.title_en && a.title_en.trim()
      ? a.title_en
      : a.title;
  return {
    title,
    href: localizeHref(`/articles/${a.slug}`, locale),
  };
}

export function toExpertOpinions(
  articles: Article[],
  limit = 6,
  locale: Locale = "ru",
): ExpertForumOpinion[] {
  return articles
    .filter((x) => /мнение/i.test(x.format))
    .slice(0, limit)
    .map((a) => ({
      title: a.title,
      href: localizeHref(`/articles/${a.slug}`, locale),
      author: {
        name: a.author.name,
        avatarUrl: a.author.avatarUrl,
      },
    }));
}

export function toExpertInterviews(
  articles: Article[],
  limit = 3,
  locale: Locale = "ru",
): ExpertForumInterview[] {
  return articles
    .filter((x) => /интервью/i.test(x.format))
    .slice(0, limit)
    .map((a) => ({
      title: a.title,
      href: localizeHref(`/articles/${a.slug}`, locale),
      coverImage: a.coverImage,
    }));
}

/** One latest article per region (first match wins by list order). */
export function buildRegionalReviewItems(
  regions: StrapiRegion[],
  articles: StrapiArticle[],
  origin: string = getStrapiUrl(),
  locale: Locale = "ru",
): RegionalReviewItem[] {
  const mapped = articles.map((x) => mapStrapiArticleToArticle(x, origin, locale));
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
  locale: Locale = "ru",
): ThematicBlockItem[] {
  const mapped = articles.map((x) => mapStrapiArticleToArticle(x, origin, locale));
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
