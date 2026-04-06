import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiGlobalReview,
  StrapiRegion,
  StrapiSingleResponse,
} from "./strapi-types";

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
  StrapiSingleResponse,
} from "./strapi-types";

const REVALIDATE = 60;

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
    next: next ?? { revalidate: REVALIDATE },
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

export async function getArticlesByRegion(
  regionSlug: string,
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("filters[region][slug][$eq]", regionSlug);
  search.set("sort[0]", "publishedAt:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
}

export async function getArticlesByCategory(
  categorySlug: string,
  limit: number,
): Promise<StrapiCollectionResponse<StrapiArticle>> {
  const search = new URLSearchParams();
  search.set("filters[categories][slug][$eq]", categorySlug);
  search.set("sort[0]", "publishedAt:desc");
  search.set("pagination[pageSize]", String(limit));
  search.set("pagination[page]", "1");
  appendArticleListPopulate(search);
  return strapiFetch<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
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
