import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageView } from "@/components/articles/ArticlePageView";
import { ViewCounter } from "@/components/articles/ViewCounter";
import { ArticleStrapiUnavailable } from "@/components/articles/ArticleStrapiUnavailable";
import {
  fetchReadAlsoArticles,
  fetchSimilarArticles,
  getArticleRenderedContent,
  getArticleTags,
} from "@/lib/article-content";
import { getArticleBySlug } from "@/lib/api";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import { getStrapiUrl } from "@/lib/strapi-config";
import type { Article } from "@/lib/types";

type ArticlePageProps = {
  params: { slug: string };
};

/**
 * Fully dynamic: no `generateStaticParams` — slugs are resolved at request time.
 * (Keeps `next build` working when Strapi is offline.)
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  try {
    const raw = await getArticleBySlug(params.slug);
    if (!raw) {
      return { title: "Статья не найдена" };
    }
    const article = mapStrapiArticleToArticle(raw, getStrapiUrl());
    return {
      title: `${article.title} — Единый Мир`,
      description: article.excerpt,
    };
  } catch {
    return { title: "Единый Мир" };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  let raw = null;
  let strapiUnreachable = false;

  try {
    raw = await getArticleBySlug(params.slug);
  } catch (e) {
    console.error(`[ArticlePage] Strapi fetch failed for /${params.slug}:`, e);
    strapiUnreachable = true;
  }

  if (strapiUnreachable) {
    return <ArticleStrapiUnavailable />;
  }

  if (!raw) {
    notFound();
  }

  const origin = getStrapiUrl();
  const article = mapStrapiArticleToArticle(raw, origin);

  const { html, toc } = getArticleRenderedContent(
    article,
    raw.content,
    raw.content_html,
  );

  let readAlso: Article[] = [];
  let similar: Article[] = [];
  try {
    [readAlso, similar] = await Promise.all([
      fetchReadAlsoArticles(article, 3),
      fetchSimilarArticles(article, 3),
    ]);
  } catch (e) {
    console.error("[ArticlePage] related articles fetch failed:", e);
  }

  const tags = getArticleTags(article);

  return (
    <>
      <ViewCounter articleId={raw.id} />
      <ArticlePageView
        article={article}
        html={html}
        toc={toc}
        readAlso={readAlso}
        similar={similar}
        tags={tags}
      />
    </>
  );
}
