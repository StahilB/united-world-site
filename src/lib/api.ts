import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiGlobalReview,
  StrapiRegion,
  StrapiSection,
  StrapiSingleResponse,
} from "./strapi-types";

export type Section = {
  id: number;
  name: string;
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
} from "./strapi-types";

const REVALIDATE = 60;
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
  params.set("populate[0]", "cover_image");
  params.set("populate[1]", "author");
  params.set("populate[2]", "categories");
  params.set("populate[3]", "region");
  params.set("populate[4]", "sections");
}

export type GetArticlesParams = {
  page?: number;
  pageSize?: number;
  /** Category slug */
  category?: string;
  /** Region slug */
  region?: string;
  /** e.g. `publishedAt:desc` or `views_count:desc` */
  sort?: string;
  /** Article format enum value */
  format?: string;
  /** Глобальные обзоры (флаг в Strapi) */
  isGlobalReview?: boolean;
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
  } = params;

  const search = new URLSearchParams();
  search.set("pagination[page]", String(page));
  search.set("pagination[pageSize]", String(pageSize));
  appendArticleListPopulate(search);

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
    search.set("sort[0]", "publishedAt:desc");
  }

  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/**
 * Single article by slug with deep populate.
 */
export async function getArticleBySlug(
  slug: string,
): Promise<StrapiArticle | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("populate", "*");
  search.set("pagination[pageSize]", "1");

  const res = await strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return res.data[0] ?? null;
}

export async function getPopularArticles(
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("sort[0]", "views_count:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

export async function getLatestArticles(
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("sort[0]", "publishedAt:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

/** Путь `/api/articles?...` для списка по региону (совпадает с телом запроса). */
export function articlesByRegionRequestPath(regionId: number, limit: number): string {
  const search = new URLSearchParams();
  search.set("filters[region][id][$eq]", String(regionId));
  search.set("sort[0]", "publishedAt:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return `/api/articles?${search.toString()}`;
}

/** Путь `/api/articles?...` для списка по категории (совпадает с телом запроса). */
export function articlesByCategoryRequestPath(
  categoryId: number,
  limit: number,
): string {
  const search = new URLSearchParams();
  search.set("filters[categories][id][$eq]", String(categoryId));
  search.set("sort[0]", "publishedAt:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return `/api/articles?${search.toString()}`;
}

/**
 * Статьи по региону. Фильтр по `region.id` (manyToOne) — надёжнее, чем вложенный `slug` в REST.
 */
export async function getArticlesByRegion(
  regionId: number,
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    articlesByRegionRequestPath(regionId, limit),
  );
}

/**
 * Статьи по категории. Фильтр по `categories.id` (manyToMany).
 */
export async function getArticlesByCategory(
  categoryId: number,
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    articlesByCategoryRequestPath(categoryId, limit),
  );
}

export async function getRegions(): Promise<
  StrapiCollectionResponse<StrapiRegion>
> {
  const search = new URLSearchParams();
  search.set("populate[0]", "cover_image");
  return strapiFetch<StrapiCollectionResponse<StrapiRegion>>(
    `/api/regions?${search.toString()}`,
  );
}

export async function getCategories(): Promise<
  StrapiCollectionResponse<StrapiCategory>
> {
  return strapiFetch<StrapiCollectionResponse<StrapiCategory>>(
    `/api/categories`,
  );
}

export async function getAuthors(): Promise<
  StrapiCollectionResponse<StrapiAuthor>
> {
  const search = new URLSearchParams();
  search.set("populate[0]", "photo");
  return strapiFetch<StrapiCollectionResponse<StrapiAuthor>>(
    `/api/authors?${search.toString()}`,
  );
}

/** Author by slug (first match). */
export async function getAuthorBySlug(
  slug: string,
): Promise<StrapiAuthor | null> {
  const search = new URLSearchParams();
  search.set("filters[slug][$eq]", slug);
  search.set("pagination[pageSize]", "1");
  search.set("populate[0]", "photo");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiAuthor>>(
    `/api/authors?${search.toString()}`,
  );
  return res.data[0] ?? null;
}

export type GetArticlesByAuthorOptions = {
  /** Напр. «колонка» для раздела «Авторские колонки» */
  format?: string;
  /** Slug раздела Section (many-to-many) */
  sectionSlug?: string;
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
  search.set("sort[0]", "publishedAt:desc");
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
    search.set("sort[0]", "publishedAt:desc");
    search.set("pagination[pageSize]", String(pageSize));
    search.set("pagination[page]", String(page));
    search.set("populate[0]", "author");
    search.set("populate[author][populate][0]", "photo");
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
      search.set("sort[0]", "publishedAt:desc");
      search.set("pagination[pageSize]", String(pageSize));
      search.set("pagination[page]", String(page));
      search.set("populate[0]", "author");
      search.set("populate[author][populate][0]", "photo");
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
      search.set("sort[0]", "publishedAt:desc");
      search.set("pagination[pageSize]", String(pageSize));
      search.set("pagination[page]", String(page));
      search.set("populate[0]", "author");
      search.set("populate[author][populate][0]", "photo");
      search.set("populate[1]", "cover_image");
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
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

/** Статьи автора в колонках: объединение по всем slug из {@link COLUMNS_SECTION_SLUGS}. */
export async function getArticlesByAuthorColumns(
  authorSlug: string,
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const byId = new Map<number, StrapiArticle>();
  const sectionSlugs = await getColumnsSectionSlugs();
  for (const sectionSlug of sectionSlugs) {
    const res = await getArticlesByAuthor(authorSlug, limit, { sectionSlug });
    for (const a of res.data ?? []) {
      byId.set(a.id, a);
    }
  }
  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
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
  search.set("pagination[pageSize]", "1");
  search.set("populate[0]", "cover_image");
  const res = await strapiFetch<StrapiCollectionResponse<StrapiRegion>>(
    `/api/regions?${search.toString()}`,
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

/**
 * Статьи раздела (many-to-many `sections`) с пагинацией.
 */
export async function getArticlesBySection(
  sectionSlug: string,
  page: number,
  pageSize: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("filters[sections][slug][$eq]", sectionSlug);
  search.set("pagination[page]", String(page));
  search.set("pagination[pageSize]", String(pageSize));
  appendArticleListPopulate(search);
  search.set("sort[0]", "publishedAt:desc");

  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
    { next: { revalidate: REVALIDATE_SECTIONS } },
  );
}
