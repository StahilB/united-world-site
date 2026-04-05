/**
 * Strapi 5 REST API entity shapes (flat `data` entries, populated relations inline).
 * @see https://docs.strapi.io/dev-docs/api/rest
 */

export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: {
    pagination?: StrapiPagination;
  };
}

export interface StrapiSingleResponse<T> {
  data: T | null;
  meta?: Record<string, unknown>;
}

export interface StrapiMediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
  path?: string | null;
}

/** Upload plugin file entry */
export interface StrapiMedia {
  id: number;
  documentId?: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, StrapiMediaFormat> | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string | null;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export type ArticleFormat =
  | "анализ"
  | "мнение"
  | "интервью"
  | "колонка"
  | "обзор";

export interface StrapiAuthor {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  bio?: string | null;
  email?: string | null;
  photo?: StrapiMedia | null;
  social_links?: Record<string, string> | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface StrapiCategory {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  color?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface StrapiRegion {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  cover_image?: StrapiMedia | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

/** Article document as returned by Content API (populate controls relation depth). */
export interface StrapiArticle {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  content?: unknown;
  excerpt?: string | null;
  cover_image?: StrapiMedia | null;
  author?: StrapiAuthor | null;
  categories?: StrapiCategory[] | null;
  region?: StrapiRegion | null;
  format?: ArticleFormat | null;
  is_global_review?: boolean | null;
  views_count?: number | null;
  reading_time?: number | null;
  /** Editorial publication date (custom field). */
  publication_date?: string | null;
  /** Strapi document service timestamp (when entry is considered published). */
  publishedAt?: string | null;
  telegram_message_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Single type: homepage «global review» highlight. */
export interface StrapiGlobalReview {
  id: number;
  documentId?: string;
  featured_article?: StrapiArticle | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}
