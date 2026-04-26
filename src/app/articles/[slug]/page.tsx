import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageView } from "@/components/articles/ArticlePageView";
import { ViewCounter } from "@/components/articles/ViewCounter";
import { ArticleStrapiUnavailable } from "@/components/articles/ArticleStrapiUnavailable";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  fetchReadAlsoArticles,
  fetchSimilarArticles,
  getArticleRenderedContent,
  getArticleTags,
} from "@/lib/article-content";
import { getArticleBySlug, getRelatedArticles } from "@/lib/api";
import { articleSchema, breadcrumbSchema } from "@/lib/schema";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import { getStrapiUrl } from "@/lib/strapi-config";
import type { Article } from "@/lib/types";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeHref } from "@/lib/i18n/types";

type ArticlePageProps = {
  params: { slug: string };
};

export const revalidate = 600;

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
  const articleUrl = `/articles/${params.slug}`;

  try {
    const raw = await getArticleBySlug(params.slug);
    if (!raw) {
      return {
        title: "Статья не найдена",
        robots: { index: false, follow: false },
      };
    }

    const image = raw.cover_image?.url;
    const absoluteImage = image
      ? image.startsWith("http")
        ? image
        : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`
      : `${SITE_URL}/og-default-brand.jpg`;
    const title = raw.title;
    const description =
      raw.excerpt?.slice(0, 160) || "Аналитический материал АНО «Единый Мир».";
    const publishedTime = raw.publication_date || raw.publishedAt || undefined;
    const modifiedTime = raw.updatedAt || undefined;
    const authorName = raw.author?.name || "АНО «Единый Мир»";
    const categoryName = raw.categories?.[0]?.name;
    const regionName = raw.region?.name;
    const tags = [categoryName, regionName].filter(
      (t): t is string => typeof t === "string" && t.length > 0,
    );
    const authors = [authorName].filter(
      (a): a is string => typeof a === "string" && a.length > 0,
    );
    const other: Record<string, string> = {
      ...(publishedTime && { "article:published_time": publishedTime }),
      ...(modifiedTime && { "article:modified_time": modifiedTime }),
      ...(authorName && { "article:author": authorName }),
      ...(categoryName && { "article:section": categoryName }),
    };

    return {
      title,
      description,
      authors: [{ name: authorName }],
      alternates: { canonical: articleUrl },
      openGraph: {
        type: "article",
        locale: "ru_RU",
        url: articleUrl,
        title,
        description,
        siteName: "Единый Мир",
        ...(publishedTime && { publishedTime }),
        ...(modifiedTime && { modifiedTime }),
        ...(authors.length > 0 && { authors }),
        ...(categoryName && { section: categoryName }),
        tags,
        images: [{ url: absoluteImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [absoluteImage],
      },
      ...(Object.keys(other).length > 0 && { other }),
    };
  } catch {
    return { title: "Статья не найдена" };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const slug = params.slug;
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  let raw = null;
  let strapiUnreachable = false;

  try {
    raw = await getArticleBySlug(slug, locale);
  } catch (e) {
    console.error(`[ArticlePage] Strapi fetch failed for /${slug}:`, e);
    strapiUnreachable = true;
  }

  if (strapiUnreachable) {
    return <ArticleStrapiUnavailable />;
  }

  if (!raw) {
    notFound();
  }
  if (locale === "en" && !raw.is_translated_en) {
    notFound();
  }

  const origin = getStrapiUrl();
  const article = mapStrapiArticleToArticle(raw, origin, locale);

  const { html, toc } = getArticleRenderedContent(
    article,
    raw.content,
    locale === "en" ? (raw.content_html_en ?? raw.content_html) : raw.content_html,
  );

  let readAlso: Article[] = [];
  let similar: Article[] = [];
  let related: Article[] = [];
  try {
    const [readAlsoRes, similarRes, relatedRes] = await Promise.all([
      fetchReadAlsoArticles(article, 3, locale),
      fetchSimilarArticles(article, 3, locale),
      getRelatedArticles(
        slug,
        raw.categories?.[0]?.slug || undefined,
        raw.region?.slug || undefined,
        4,
        locale,
      ),
    ]);
    readAlso = readAlsoRes;
    similar = similarRes;
    related = (relatedRes.data ?? []).map((a) =>
      mapStrapiArticleToArticle(a, origin, locale),
    );
  } catch (e) {
    console.error("[ArticlePage] related articles fetch failed:", e);
  }

  const tags = getArticleTags(article);
  const primaryCategory = article.categories[0];

  return (
    <>
      <JsonLd
        data={articleSchema({
          title: article.title,
          slug,
          excerpt: article.excerpt,
          coverImage: article.coverImage,
          publishedAt: article.publishedAt,
          authorName: article.author.name || "АНО «Единый Мир»",
          authorSlug: article.author.slug || undefined,
          categoryName: primaryCategory?.name,
          wordCount: article.readingTime ? article.readingTime * 180 : undefined,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Главная", url: "/" },
          ...(primaryCategory?.name
            ? [
                {
                  name: primaryCategory.name,
                  url: primaryCategory.slug ? `/section/${primaryCategory.slug}` : "/",
                },
              ]
            : []),
          { name: article.title, url: localizeHref(`/articles/${slug}`, locale) },
        ])}
      />
      <ViewCounter articleId={raw.id} />
      <ArticlePageView
        article={article}
        html={html}
        toc={toc}
        readAlso={readAlso}
        similar={similar}
        related={related}
        tags={tags}
        locale={locale}
        dict={dict}
      />
    </>
  );
}
