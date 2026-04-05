import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageView } from "@/components/articles/ArticlePageView";
import {
  fetchReadAlsoArticles,
  fetchSimilarArticles,
  getArticleRenderedContent,
  getArticleTags,
} from "@/lib/article-content";
import { getArticleBySlug } from "@/lib/api";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import { getStrapiUrl } from "@/lib/strapi-config";

type ArticlePageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const raw = await getArticleBySlug(params.slug);
  if (!raw) {
    return { title: "Статья не найдена" };
  }
  const article = mapStrapiArticleToArticle(raw, getStrapiUrl());
  return {
    title: `${article.title} — Единый Мир`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const raw = await getArticleBySlug(params.slug);
  if (!raw) {
    notFound();
  }

  const origin = getStrapiUrl();
  const article = mapStrapiArticleToArticle(raw, origin);

  const { html, toc } = getArticleRenderedContent(article, raw.content);
  const [readAlso, similar] = await Promise.all([
    fetchReadAlsoArticles(article, 3),
    fetchSimilarArticles(article, 3),
  ]);
  const tags = getArticleTags(article);

  return (
    <ArticlePageView
      article={article}
      html={html}
      toc={toc}
      readAlso={readAlso}
      similar={similar}
      tags={tags}
    />
  );
}
