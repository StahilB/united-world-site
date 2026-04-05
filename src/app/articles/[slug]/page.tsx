import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageView } from "@/components/articles/ArticlePageView";
import {
  getArticleRenderedContent,
  getArticleTags,
  getReadAlsoArticles,
  getSimilarArticles,
  resolveArticle,
} from "@/lib/article-content";

type ArticlePageProps = {
  params: { slug: string };
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const article = resolveArticle(params.slug);
  if (!article) {
    return { title: "Статья не найдена" };
  }
  return {
    title: `${article.title} — Единый Мир`,
    description: article.excerpt,
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = resolveArticle(params.slug);
  if (!article) {
    notFound();
  }

  const { html, toc } = getArticleRenderedContent(article);
  const readAlso = getReadAlsoArticles(article, 3);
  const similar = getSimilarArticles(article, 3);
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
