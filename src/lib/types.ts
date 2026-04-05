export interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
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
  excerpt?: string;
  body?: string;
  publishedAt?: string;
  author?: Author;
  category?: Category;
  region?: Region;
}
