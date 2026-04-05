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
