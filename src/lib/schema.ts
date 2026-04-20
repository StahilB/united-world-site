const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Автономная некоммерческая организация «Центр мониторинга и оценки проблем современности «Единый Мир»",
    legalName:
      "Автономная некоммерческая организация «Центр мониторинга и оценки проблем современности «Единый Мир»",
    alternateName: [
      "АНО «Единый Мир»",
      "Центр мониторинга и оценки проблем современности",
    ],
    url: "https://anounitedworld.com",
    logo: "https://anounitedworld.com/icon-512.png",
    foundingDate: "2024-11-05",
    taxID: "1300013041",
    description: "Независимый аналитический центр общественной дипломатии",
    email: "official@anounitedworld.com",
    telephone: "+7-927-274-75-50",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Лихачёва, д. 22, кв. 18",
      addressLocality: "Саранск",
      addressRegion: "Республика Мордовия",
      postalCode: "430031",
      addressCountry: "RU",
    },
    sameAs: [
      "https://t.me/anounitedworld",
      "https://vk.com/ano_unitedworld",
      "https://www.facebook.com/profile.php?id=61584222782494",
      "https://www.youtube.com/@anounitedworld",
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Единый Мир",
    url: SITE_URL,
    inLanguage: "ru-RU",
    publisher: { "@type": "NGO", name: "АНО «Единый Мир»" },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(article: {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
  authorSlug?: string;
  categoryName?: string;
  wordCount?: number;
}) {
  const absoluteImage = absoluteUrl(article.coverImage || "/og-default-brand.jpg");

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/articles/${article.slug}`,
    },
    headline: article.title,
    description: article.excerpt,
    image: [absoluteImage],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Person",
      name: article.authorName,
      ...(article.authorSlug && { url: `${SITE_URL}/author/${article.authorSlug}` }),
    },
    publisher: {
      "@type": "NGO",
      name: "АНО «Единый Мир»",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    articleSection: article.categoryName,
    inLanguage: "ru-RU",
    ...(article.wordCount && { wordCount: article.wordCount }),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function personSchema(author: {
  name: string;
  slug: string;
  bio?: string;
  photo?: string;
  jobTitle?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${SITE_URL}/author/${author.slug}`,
    description: author.bio,
    image: author.photo,
    jobTitle: author.jobTitle,
    worksFor: {
      "@type": "NGO",
      name: "АНО «Единый Мир»",
    },
  };
}
