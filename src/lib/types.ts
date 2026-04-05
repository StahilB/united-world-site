export interface Author {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /** Accent color for UI (hex) */
  color: string;
}

export interface Region {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

/** Главная статья блока «Глобальные обзоры» на главной */
export interface GlobalReviewsMainArticle {
  title: string;
  excerpt: string;
  /** Уже отформатированная дата для показа */
  date: string;
  /** ISO 8601 для атрибута dateTime */
  dateIso: string;
  href: string;
}

/** Пункт списка «Самое читаемое» в блоке глобальных обзоров */
export interface GlobalReviewsPopularArticle {
  title: string;
  href: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  author: Author;
  categories: Category[];
  region: Region;
  /** Display format label, e.g. analytics, review */
  format: string;
  publishedAt: string;
  viewsCount: number;
  /** Estimated reading time in minutes */
  readingTime: number;
  body?: string;
}
