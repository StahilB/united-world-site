import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiGlobalReview,
  StrapiRegion,
  StrapiSection,
  StrapiSingleResponse,
  StrapiStaticPage,
} from "./strapi-types";
import type { Locale } from "./i18n/types";

export type Section = {
  id: number;
  name: string;
  name_en?: string | null;
  slug: string;
  order: number;
  children: Section[];
};

export { getStrapiUrl } from "./strapi-config";

export type {
  ArticleFormat,
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiMedia,
  StrapiPagination,
  StrapiRegion,
  StrapiSection,
  StrapiSingleResponse,
  StrapiStaticPage,
  StrapiStaticTeamMember,
} from "./strapi-types";

const REVALIDATE = 300;
const REVALIDATE_ARTICLE = 600;
const REVALIDATE_AUTHORS = 3600;
const REVALIDATE_CATEGORIES = 300;
const REVALIDATE_REGIONS = 300;
/** Кэш дерева разделов и списков по разделу */
const REVALIDATE_SECTIONS = 300;

/**
 * Базовый URL для запросов к Strapi: на сервере (Docker) — внутренняя сеть,
 * в браузере — публичный хост из NEXT_PUBLIC_*.
 */
function getStrapiFetchUrl(): string {
  const strapiUrl =
    typeof window === "undefined"
      ? process.env.STRAPI_URL || "http://strapi:1337"
      : process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
  return strapiUrl.replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.STRAPI_TOKEN;
  if (token && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function joinUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getStrapiFetchUrl()}${p}`;
}

/** Полный URL запроса к Strapi (для логов / диагностики). */
export function strapiAbsoluteUrl(path: string): string {
  return joinUrl(path);
}

async function strapiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number | false } },
): Promise<T> {
  const { next, ...rest } = init ?? {};
  const res = await fetch(joinUrl(path), {
    ...rest,
    headers: {
      ...authHeaders(),
      ...(rest.headers as Record<string, string> | undefined),
    },
    next: next !== undefined ? next : { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Uncached fetch (mutations and read-before-write). */
async function strapiFetchNoStore<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(joinUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Populate relations for article list cards (matches spec). */
function appendArticleListPopulate(params: URLSearchParams): void {
  params.set("fields[0]", "title");
  params.set("fields[1]", "title_en");
  params.set("fields[2]", "excerpt");
  params.set("fields[3]", "excerpt_en");
  params.set("fields[4]", "is_translated_en");
  params.set("fields[5]", "slug");
  params.set("fields[6]", "format");
  params.set("fields[7]", "publication_date");
  params.set("fields[8]", "views_count");
  params.set("fields[9]", "reading_time");
  params.set("fields[10]", "is_global_review");

  // Strapi 5 REST: nested populate via bracket syntax
  params.set("populate[cover_image][fields][0]", "url");
  params.set("populate[cover_image][fields][1]", "width");
  params.set("populate[cover_image][fields][2]", "height");

  params.set("populate[author][fields][0]", "id");
  params.set("populate[author][fields][1]", "name");
  params.set("populate[author][fields][2]", "name_en");
  params.set("populate[author][fields][3]", "slug");
  params.set("populate[author][fields][4]", "bio");
  params.set("populate[author][fields][5]", "bio_en");
  params.set("populate[author][populate][photo][fields][0]", "url");

  params.set("populate[categories][fields][0]", "id");
  params.set("populate[categories][fields][1]", "name");
  params.set("populate[categories][fields][2]", "name_en");
  params.set("populate[categories][fields][3]", "slug");
  params.set("populate[categories][fields][4]", "color");
  params.set("populate[categories][fields][5]", "description");
  params.set("populate[categories][fields][6]", "description_en");

  params.set("populate[region][fields][0]", "id");
  params.set("populate[region][fields][1]", "name");
  params.set("populate[region][fields][2]", "name_en");
  params.set("populate[region][fields][3]", "slug");

  params.set("populate[sections][fields][0]", "id");
  params.set("populate[sections][fields][1]", "name");
  params.set("populate[sections][fields][2]", "name_en");
  params.set("populate[sections][fields][3]", "slug");
}

function appendLocaleFilter(params: URLSearchParams, locale?: Locale): void {
  if (locale === "en") {
    params.set("filters[is_translated_en][$eq]", "true");
  }
}

export type GetArticlesParams = {
  page?: number;
  pageSize?: number;
  /** Category slug */
  category?: string;
  /** Region slug */
  region?: string;
  /** e.g. `publication_date:desc` or `views_count:desc` */
  sort?: string;
  /** Article format enum value */
  format?: string;
  /** Глобальные обзоры (флаг в Strapi) */
  isGlobalReview?: boolean;
  /** Если 'en' — фильтр только по переведенным материалам */
  locale?: Locale;
};

/**
 * Paginated articles with populated cover, author, categories, region.
 */
export async function getArticles(
  params: GetArticlesParams = {},
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const {
    page = 1,
    pageSize = 10,
    category,
    region,
    sort,
    format,
    isGlobalReview,
    locale,
  } = params;

  const search = new URLSearchParams();
  search.set("pagination[page]", String(page));
  search.set("pagination[pageSize]", String(pageSize));
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);

  if (category) {
    search.set("filters[categories][slug][$eq]", category);
  }
  if (region) {
    search.set("filters[region][slug][$eq]", region);
  }
  if (format) {
    search.set("filters[format][$eq]", format);
  }
  if (isGlobalReview === true) {
    search.set("filters[is_global_review][$eq]", "true");
  }

  if (sort) {
    const parts = sort.split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach((part, i) => {
      search.set(`sort[${i}]`, part);
    });
  } else {
    search.set("sort[0]", "publication_date:desc");
  }

  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/**
 * Single article by slug with deep populate.
 * Скалярные поля (`content`, `content_html`, `excerpt`, …) приходят в корне документа
 * при соответствующих правах роли (populate касается только связей).
 */
export async function getArticleBySlug(
  slug: string,
  locale?: Locale,
): Promise<StrapiArticle | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("pagination[pageSize]", "1");
  if (locale === "en") {
    search.set("filters[is_translated_en][$eq]", "true");
  }

  // Deep populate — author.photo + other relations used on article page
  search.set("populate[cover_image]", "true");
  search.set("populate[author][fields][0]", "id");
  search.set("populate[author][fields][1]", "name");
  search.set("populate[author][fields][2]", "name_en");
  search.set("populate[author][fields][3]", "slug");
  search.set("populate[author][fields][4]", "bio");
  search.set("populate[author][fields][5]", "bio_en");
  search.set("populate[author][populate][photo][fields][0]", "url");
  search.set("populate[categories]", "true");
  search.set("populate[region]", "true");
  search.set("populate[sections]", "true");

  const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
    { next: { revalidate: REVALIDATE_ARTICLE } },
  );
  return res.data[0] ?? null;
}

export async function getPopularArticles(
  limit: number,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("sort[0]", "views_count:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/**
 * Самые читаемые среди опубликованных за последние N дней.
 * Для hero на главной, чтобы не вылезали старые статьи.
 */
export async function getRecentPopularArticles(
  limit: number,
  days: number = 90,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const isoSince = since.toISOString();

  const search = new URLSearchParams();
  search.set("sort[0]", "views_count:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  search.set("filters[publication_date][$gte]", isoSince);
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);

  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

export async function getLatestArticles(
  limit: number,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

export async function getRelatedArticles(
  articleSlug: string,
  categorySlug?: string,
  regionSlug?: string,
  limit = 4,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const picked: StrapiArticle[] = [];
  const seen = new Set<string>([articleSlug]);

  const addUnique = (items: StrapiArticle[]) => {
    for (const item of items) {
      if (picked.length >= limit) break;
      if (!item?.slug || seen.has(item.slug)) continue;
      seen.add(item.slug);
      picked.push(item);
    }
  };

  const queryByFilter = async (
    filterKey: string,
    filterValue: string,
    pageSize: number,
  ): Promise<StrapiArticle[]> => {
    const search = new URLSearchParams();
    search.set("filters[slug][$ne]", articleSlug);
    search.set(filterKey, filterValue);
    search.set("sort[0]", "publication_date:desc");
    search.set("pagination[page]", "1");
    search.set("pagination[pageSize]", String(pageSize));
    appendArticleListPopulate(search);
    appendLocaleFilter(search, locale);
    const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
      `/api/articles?${search.toString()}`,
      { next: { revalidate: 300 } },
    );
    return res.data ?? [];
  };

  if (categorySlug) {
    const items = await queryByFilter("filters[categories][slug][$eq]", categorySlug, limit);
    addUnique(items);
  }

  if (regionSlug && picked.length < limit) {
    const items = await queryByFilter(
      "filters[region][slug][$eq]",
      regionSlug,
      Math.max(limit * 2, 8),
    );
    addUnique(items);
  }

  if (picked.length < limit) {
    const latest = await getLatestArticles(Math.max(limit * 3, 12), locale);
    addUnique((latest.data ?? []).filter((a) => a.slug !== articleSlug));
  }

  return {
    data: picked.slice(0, limit),
    meta: {
      pagination: {
        page: 1,
        pageSize: limit,
        pageCount: 1,
        total: picked.length,
      },
    },
  };
}

/** Путь `/api/articles?...` для списка по региону (совпадает с телом запроса). */
export function articlesByRegionRequestPath(regionId: number, limit: number): string {
  const search = new URLSearchParams();
  search.set("filters[region][id][$eq]", String(regionId));
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return `/api/articles?${search.toString()}`;
}

/** Путь `/api/articles?...` для списка по категории (совпадает с телом запроса). */
export function articlesByCategoryRequestPath(
  categoryId: number,
  limit: number,
  locale?: Locale,
): string {
  const search = new URLSearchParams();
  search.set("filters[categories][id][$eq]", String(categoryId));
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);
  return `/api/articles?${search.toString()}`;
}

/**
 * Статьи по региону. Фильтр по `region.id` (manyToOne) — надёжнее, чем вложенный `slug` в REST.
 */
export async function getArticlesByRegion(
  regionId: number,
  limit: number,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("filters[region][id][$eq]", String(regionId));
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/**
 * Статьи по категории. Фильтр по `categories.id` (manyToMany).
 */
export async function getArticlesByCategory(
  categoryId: number,
  limit: number,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    articlesByCategoryRequestPath(categoryId, limit, locale),
  );
}

export async function getRegions(): Promise<
  StrapiCollectionResponse<StrapiRegion>
> {
  const search = new URLSearchParams();
  search.set("fields[0]", "name");
  search.set("fields[1]", "name_en");
  search.set("fields[2]", "slug");
  search.set("populate[0]", "cover_image");
  search.set("pagination[pageSize]", "100");
  return strapiFetch<StrapiCollectionResponse<StrapiRegion>>(
    `/api/regions?${search.toString()}`,
  );
}

export async function getCategories(): Promise<
  StrapiCollectionResponse<StrapiCategory>
> {
  const search = new URLSearchParams();
  search.set("fields[0]", "name");
  search.set("fields[1]", "name_en");
  search.set("fields[2]", "slug");
  search.set("fields[3]", "color");
  search.set("pagination[pageSize]", "100");
  return strapiFetch<StrapiCollectionResponse<StrapiCategory>>(
    `/api/categories?${search.toString()}`,
    { next: { revalidate: REVALIDATE_CATEGORIES } },
  );
}

export async function getAuthors(): Promise<
  StrapiCollectionResponse<StrapiAuthor>
> {
  const search = new URLSearchParams();
  search.set("populate[0]", "photo");
  return strapiFetch<StrapiCollectionResponse<StrapiAuthor>>(
    `/api/authors?${search.toString()}`,
    { next: { revalidate: REVALIDATE_AUTHORS } },
  );
}

/** Author by slug (first match). */
export async function getAuthorBySlug(
  slug: string,
): Promise<StrapiAuthor | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("pagination[pageSize]", "1");
  search.set("fields[0]", "name");
  search.set("fields[1]", "name_en");
  search.set("fields[2]", "bio");
  search.set("fields[3]", "bio_en");
  search.set("fields[4]", "slug");
  search.set("populate[0]", "photo");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiAuthor>>(
    `/api/authors?${search.toString()}`,
    { next: { revalidate: REVALIDATE_AUTHORS } },
  );
  return res.data[0] ?? null;
}

export type GetArticlesByAuthorOptions = {
  /** Напр. «колонка» для раздела «Авторские колонки» */
  format?: string;
  /** Slug раздела Section (many-to-many) */
  sectionSlug?: string;
  locale?: Locale;
};

/**
 * Slug раздела «Авторские колонки» в Strapi (основной и fallback из seed).
 * Запросы объединяют статьи, привязанные к любому из этих slug.
 */
export const COLUMNS_SECTION_SLUGS = [
  "avtorskie-kolonki",
  "avtorskie-kolonki-ekspertiza",
] as const;

function flattenSections(tree: Section[]): Section[] {
  const out: Section[] = [];
  const stack = [...tree];
  while (stack.length) {
    const n = stack.shift();
    if (!n) continue;
    out.push(n);
    if (n.children?.length) {
      stack.push(...n.children);
    }
  }
  return out;
}

/** Находим реальный slug секции «Авторские колонки» в Strapi (если доступен Section API). */
export async function getColumnsSectionSlugs(): Promise<string[]> {
  const out = new Set<string>(COLUMNS_SECTION_SLUGS);
  try {
    const tree = await getSections(false);
    for (const s of flattenSections(tree)) {
      if (String(s.name).trim().toLowerCase() === "авторские колонки") {
        out.add(s.slug);
      }
    }
  } catch {
    // Если /api/sections недоступен (permissions), остаёмся на известных slug.
  }
  return Array.from(out.values());
}

export async function getArticlesByAuthor(
  authorSlug: string,
  limit: number,
  options?: GetArticlesByAuthorOptions,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("filters[author][slug][$eq]", authorSlug);
  if (options?.format) {
    search.set("filters[format][$eq]", options.format);
  }
  if (options?.sectionSlug) {
    search.set("filters[sections][slug][$eq]", options.sectionSlug);
  }
  appendLocaleFilter(search, options?.locale);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/**
 * Авторы, у которых есть хотя бы одна статья с данным format (для «Авторские колонки»).
 */
export async function getAuthorsForArticleFormat(
  format: string,
  pageSize = 100,
): Promise<StrapiAuthor[]> {
  const byId = new Map<number, StrapiAuthor>();
  let page = 1;
  let pageCount = 1;
  do {
    const search = new URLSearchParams();
    search.set("filters[format][$eq]", format);
    search.set("sort[0]", "publication_date:desc");
    search.set("pagination[pageSize]", String(pageSize));
    search.set("pagination[page]", String(page));
    search.set("populate[author][fields][0]", "id");
    search.set("populate[author][fields][1]", "name");
    search.set("populate[author][fields][2]", "slug");
    search.set("populate[author][fields][3]", "bio");
    search.set("populate[author][populate][photo][fields][0]", "url");
    const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
      `/api/articles?${search.toString()}`,
    );
    for (const row of res.data ?? []) {
      const a = row.author;
      if (a?.id != null) {
        byId.set(a.id, a);
      }
    }
    pageCount = res.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );
}

/**
 * Авторы, у которых есть статьи в разделе «Авторские колонки» (по Section.slug).
 */
export async function getAuthorsForColumnsSection(
  pageSize = 100,
): Promise<StrapiAuthor[]> {
  const byId = new Map<number, StrapiAuthor>();
  const sectionSlugs = await getColumnsSectionSlugs();
  for (const sectionSlug of sectionSlugs) {
    let page = 1;
    let pageCount = 1;
    do {
      const search = new URLSearchParams();
      search.set("filters[sections][slug][$eq]", sectionSlug);
      search.set("sort[0]", "publication_date:desc");
      search.set("pagination[pageSize]", String(pageSize));
      search.set("pagination[page]", String(page));
      search.set("populate[author][fields][0]", "id");
      search.set("populate[author][fields][1]", "name");
      search.set("populate[author][fields][2]", "name_en");
      search.set("populate[author][fields][3]", "slug");
      search.set("populate[author][fields][4]", "bio");
      search.set("populate[author][fields][5]", "bio_en");
      search.set("populate[author][populate][photo][fields][0]", "url");
      const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
        `/api/articles?${search.toString()}`,
      );
      for (const row of res.data ?? []) {
        const a = row.author;
        if (a?.id != null) {
          byId.set(a.id, a);
        }
      }
      pageCount = res.meta?.pagination?.pageCount ?? 1;
      page += 1;
    } while (page <= pageCount);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );
}

/**
 * Статьи для страницы «Авторские колонки».
 * Запрос соответствует спецификации: filter по `sections.slug`, populate `author,cover_image`, sort по дате.
 */
export async function getArticlesForColumnsSection(
  pageSize = 100,
): Promise<StrapiArticle[]> {
  const byId = new Map<number, StrapiArticle>();
  const sectionSlugs = await getColumnsSectionSlugs();
  for (const sectionSlug of sectionSlugs) {
    let page = 1;
    let pageCount = 1;
    do {
      const search = new URLSearchParams();
      search.set("filters[sections][slug][$eq]", sectionSlug);
      search.set("sort[0]", "publication_date:desc");
      search.set("pagination[pageSize]", String(pageSize));
      search.set("pagination[page]", String(page));
      search.set("populate[author][fields][0]", "id");
      search.set("populate[author][fields][1]", "name");
      search.set("populate[author][fields][2]", "slug");
      search.set("populate[author][fields][3]", "bio");
      search.set("populate[author][populate][photo][fields][0]", "url");
      search.set("populate[cover_image][fields][0]", "url");
      search.set("populate[cover_image][fields][1]", "width");
      search.set("populate[cover_image][fields][2]", "height");
      const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
        `/api/articles?${search.toString()}`,
      );
      for (const row of res.data ?? []) {
        byId.set(row.id, row);
      }
      pageCount = res.meta?.pagination?.pageCount ?? 1;
      page += 1;
    } while (page <= pageCount);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const rawA = a.publication_date ?? a.publishedAt ?? a.createdAt;
    const rawB = b.publication_date ?? b.publishedAt ?? b.createdAt;
    const ta = rawA ? new Date(rawA).getTime() : 0;
    const tb = rawB ? new Date(rawB).getTime() : 0;
    return tb - ta;
  });
}

/** Статьи автора в колонках: объединение по всем slug из {@link COLUMNS_SECTION_SLUGS}. */
export async function getArticlesByAuthorColumns(
  authorSlug: string,
  limit: number,
  locale?: Locale,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const byId = new Map<number, StrapiArticle>();
  const sectionSlugs = await getColumnsSectionSlugs();
  for (const sectionSlug of sectionSlugs) {
    const res = await getArticlesByAuthor(authorSlug, limit, {
      sectionSlug,
      locale,
    });
    for (const a of res.data ?? []) {
      byId.set(a.id, a);
    }
  }
  const merged = Array.from(byId.values()).sort((a, b) => {
    const rawA = a.publication_date ?? a.publishedAt ?? a.createdAt;
    const rawB = b.publication_date ?? b.publishedAt ?? b.createdAt;
    const ta = rawA ? new Date(rawA).getTime() : 0;
    const tb = rawB ? new Date(rawB).getTime() : 0;
    return tb - ta;
  });
  const data = merged.slice(0, limit);
  return {
    data,
    meta: {
      pagination: {
        page: 1,
        pageSize: limit,
        pageCount: 1,
        total: data.length,
      },
    },
  };
}

/** Homepage singleton: featured article for «Глобальные обзоры». */
export async function getGlobalReview(): Promise<
  StrapiSingleResponse<StrapiGlobalReview>
> {
  const search = new URLSearchParams();
  search.set("populate[featured_article][populate]", "*");
  return strapiFetch<StrapiSingleResponse<StrapiGlobalReview>>(
    `/api/global-review?${search.toString()}`,
  );
}

/** Singleton: HTML + team JSON for static routes (/about, /team, …). */
export async function getStaticPages(): Promise<
  StrapiSingleResponse<StrapiStaticPage>
> {
  try {
    const raw = await strapiFetch<Record<string, unknown>>(
      "/api/static-page?populate=*",
      { next: { revalidate: 60 } },
    );
    if (raw && typeof raw === "object" && "data" in raw && raw.data) {
      return raw as unknown as StrapiSingleResponse<StrapiStaticPage>;
    }
    if (
      raw &&
      typeof raw === "object" &&
      ("about_html" in raw || "cooperation_html" in raw)
    ) {
      return { data: raw as unknown as StrapiStaticPage };
    }
    return { data: null };
  } catch (err) {
    console.error("[getStaticPages] Error:", err);
    return { data: null };
  }
}

/**
 * Increments `views_count` by 1. Requires a Strapi API token with **update** permission
 * on `article` (Public role only has find/findOne by default).
 */
export async function incrementViews(articleId: number): Promise<StrapiSingleResponse<StrapiArticle>> {
  const fields = new URLSearchParams();
  fields.set("fields[0]", "views_count");

  const current = await strapiFetchNoStore<StrapiSingleResponse<StrapiArticle>>(
    `/api/articles/${articleId}?${fields.toString()}`,
    { method: "GET" },
  );

  const raw = current.data?.views_count;
  const currentCount = typeof raw === "number" ? raw : Number(raw) || 0;

  const res = await fetch(joinUrl(`/api/articles/${articleId}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      data: {
        views_count: currentCount + 1,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi ${res.status} PUT /api/articles/${articleId}: ${body}`);
  }

  return res.json() as Promise<StrapiSingleResponse<StrapiArticle>>;
}

/** Category by slug (first match). */
export async function getCategoryBySlug(
  slug: string,
): Promise<StrapiCategory | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("pagination[pageSize]", "1");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiCategory>>(
    `/api/categories?${search.toString()}`,
  );
  return res.data[0] ?? null;
}

/** Region by slug (first match). */
export async function getRegionBySlug(
  slug: string,
): Promise<StrapiRegion | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("fields[0]", "name");
  search.set("fields[1]", "name_en");
  search.set("fields[2]", "slug");
  search.set("pagination[pageSize]", "1");
  search.set("populate[0]", "cover_image");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiRegion>>(
    `/api/regions?${search.toString()}`,
    { next: { revalidate: REVALIDATE_REGIONS } },
  );
  return res.data[0] ?? null;
}

function buildSectionTreeFromFlat(
  rows: StrapiSection[],
  menuOnly: boolean,
): Section[] {
  const filtered = menuOnly
    ? rows.filter((s) => s.is_visible_in_menu !== false)
    : rows;
  const byId = new Map<number, Section>();
  const parentOf = new Map<number, number | null>();

  for (const s of filtered) {
    const pid = s.parent?.id ?? null;
    parentOf.set(s.id, pid);
    byId.set(s.id, {
      id: s.id,
      name: s.name,
      name_en: s.name_en ?? null,
      slug: s.slug,
      order: s.order ?? 0,
      children: [],
    });
  }

  const roots: Section[] = [];
  for (const s of filtered) {
    const node = byId.get(s.id)!;
    const pid = parentOf.get(s.id) ?? null;
    if (pid === null) {
      roots.push(node);
    } else {
      const parent = byId.get(pid);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const sortDeep = (n: Section) => {
    n.children.sort((a, b) => a.order - b.order);
    n.children.forEach(sortDeep);
  };
  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortDeep);
  return roots;
}

/**
 * Плоский список разделов из Strapi → дерево.
 * GET с populate parent, сортировка по order.
 * @param menuOnly если true — только пункты с `is_visible_in_menu !== false` (для шапки).
 */
export async function getSections(menuOnly = true): Promise<Section[]> {
  const search = new URLSearchParams();
  search.set("fields[0]", "name");
  search.set("fields[1]", "slug");
  search.set("fields[2]", "order");
  search.set("fields[3]", "name_en");
  search.set("populate[0]", "parent");
  search.set("sort[0]", "order:asc");
  search.set("pagination[pageSize]", "100");
  search.set("pagination[page]", "1");

  const res = await strapiFetch<StrapiCollectionResponse<StrapiSection>>(
    `/api/sections?${search.toString()}`,
    { next: { revalidate: REVALIDATE_SECTIONS } },
  );
  return buildSectionTreeFromFlat(res.data ?? [], menuOnly);
}

/**
 * Цепочка от корня до раздела с данным slug (включая целевой узел).
 */
export function findSectionPath(
  tree: Section[],
  slug: string,
): Section[] | null {
  function walk(nodes: Section[], ancestors: Section[]): Section[] | null {
    for (const n of nodes) {
      if (n.slug === slug) return [...ancestors, n];
      const hit = walk(n.children, [...ancestors, n]);
      if (hit) return hit;
    }
    return null;
  }
  return walk(tree, []);
}

/**
 * Один раздел с родителем и детьми (как в Strapi).
 */
export async function getSectionBySlug(
  slug: string,
): Promise<StrapiSection | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("pagination[pageSize]", "1");
  search.set("populate[0]", "parent");
  search.set("populate[1]", "children");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiSection>>(
    `/api/sections?${search.toString()}`,
    { next: { revalidate: REVALIDATE_SECTIONS } },
  );
  const row = res.data[0] ?? null;
  if (row?.children?.length) {
    row.children = [...row.children].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }
  return row;
}

export type GetArticlesBySectionOptions = {
  /** Пересечение: статья должна быть и в текущей секции, и в этой (другая ветка рубрик). */
  filterSectionSlug?: string;
  /** Фильтр по региону для раздела */
  regionSlug?: string;
  /** Только материалы с флагом global review */
  isGlobalReview?: boolean;
  locale?: Locale;
};

/**
 * Статьи раздела (many-to-many `sections`) с пагинацией.
 * При `filterSectionSlug` — дополнительное условие через $and (обе секции у статьи).
 */
export async function getArticlesBySection(
  sectionSlug: string,
  page: number = 1,
  pageSize: number = 12,
  options: GetArticlesBySectionOptions = {},
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  const filterExtra = options.filterSectionSlug?.trim();
  if (filterExtra) {
    search.set("filters[$and][0][sections][slug][$eq]", sectionSlug);
    search.set("filters[$and][1][sections][slug][$eq]", filterExtra);
  } else {
    search.set("filters[sections][slug][$eq]", sectionSlug);
  }
  search.set("pagination[page]", String(page));
  search.set("pagination[pageSize]", String(pageSize));
  if (options.regionSlug) {
    search.set("filters[region][slug][$eq]", options.regionSlug);
  }
  if (options.isGlobalReview === true) {
    search.set("filters[is_global_review][$eq]", "true");
  }
  appendArticleListPopulate(search);
  appendLocaleFilter(search, options.locale);
  search.set("sort[0]", "publication_date:desc");

  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
    { next: { revalidate: REVALIDATE_SECTIONS } },
  );
}

/** Параметры поиска статей (список /api/search и страница /search). */
export type SearchArticlesParams = {
  q?: string;
  /** Несколько значений `format` (enum в Strapi). */
  formats?: string[];
  region?: string;
  /** Категория / тематика (slug). */
  category?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  locale?: Locale;
};

function normalizeDayStart(isoDate: string): string {
  const t = isoDate.trim();
  if (t.includes("T")) return t;
  return `${t}T00:00:00.000Z`;
}

function normalizeDayEnd(isoDate: string): string {
  const t = isoDate.trim();
  if (t.includes("T")) return t;
  return `${t}T23:59:59.999Z`;
}

/**
 * Поиск статей в Strapi (title + фильтры). Без кэша Next — для API route и актуальных результатов.
 */
export async function searchArticles(
  params: SearchArticlesParams,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const {
    q,
    formats = [],
    region,
    category,
    author,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 12,
    locale,
  } = params;

  const qTrim = q?.trim() ?? "";
  const hasQ = qTrim.length > 0;
  const hasFmt = formats.length > 0;
  const hasOther =
    Boolean(region) ||
    Boolean(category) ||
    Boolean(author) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  if (!hasQ && !hasFmt && !hasOther) {
    return {
      data: [],
      meta: {
        pagination: {
          page: 1,
          pageSize,
          pageCount: 0,
          total: 0,
        },
      },
    };
  }

  const search = new URLSearchParams();
  search.set("pagination[page]", String(page));
  search.set("pagination[pageSize]", String(pageSize));
  appendArticleListPopulate(search);
  appendLocaleFilter(search, locale);
  search.set("sort[0]", "publication_date:desc");

  if (hasQ) {
    search.set("filters[title][$containsi]", qTrim);
  }

  if (formats.length === 1) {
    search.set("filters[format][$eq]", formats[0]);
  } else if (formats.length > 1) {
    formats.forEach((f, i) => {
      search.set(`filters[format][$in][${i}]`, f);
    });
  }

  if (region) {
    search.set("filters[region][slug][$eq]", region);
  }
  if (category) {
    search.set("filters[categories][slug][$eq]", category);
  }
  if (author) {
    search.set("filters[author][slug][$eq]", author);
  }
  if (dateFrom) {
    search.set("filters[publication_date][$gte]", normalizeDayStart(dateFrom));
  }
  if (dateTo) {
    search.set("filters[publication_date][$lte]", normalizeDayEnd(dateTo));
  }

  return strapiFetchNoStore<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}
