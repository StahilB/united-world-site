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

export interface SectionTreeNode {
  id: string;
  name: string;
  name_en?: string | null;
  slug: string;
  children: SectionTreeNode[];
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
  /** Обложка из Strapi; если нет — блок hero без изображения */
  coverImage?: string;
}

/** Пункт списка «Самое читаемое» в блоке глобальных обзоров */
export interface GlobalReviewsPopularArticle {
  title: string;
  href: string;
}

/** Мнение в блоке «Экспертный форум» */
export interface ExpertForumOpinion {
  title: string;
  href: string;
  author: {
    name: string;
    avatarUrl: string;
  };
}

/** Интервью в блоке «Экспертный форум» */
export interface ExpertForumInterview {
  title: string;
  href: string;
  coverImage: string;
}

/** Карточка блока «Тематика» на главной */
export interface ThematicBlockItem {
  category: {
    name: string;
    slug: string;
    color: string;
  };
  article: {
    title: string;
    slug: string;
    coverImage: string;
    /** Рубрика / формат материала */
    format: string;
  };
}

/** Карточка блока «Ежемесячные обзоры по регионам» */
export interface RegionalReviewItem {
  region: { name: string; name_en?: string | null; slug: string };
  article: {
    title: string;
    slug: string;
    coverImage: string;
  };
}

/** Table of contents entry (article page sidebar). */
export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

/** Навигационный раздел (Section) в карточке / крошках */
export type ArticleSectionNav = {
  name: string;
  slug: string;
};

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  author: Author;
  categories: Category[];
  /** Разделы сайта (Strapi Section), порядок как в CMS */
  sections?: ArticleSectionNav[];
  region: Region;
  /** Display format label, e.g. analytics, review */
  format: string;
  publishedAt: string;
  viewsCount: number;
  /** Estimated reading time in minutes */
  readingTime: number;
  body?: string;
}
