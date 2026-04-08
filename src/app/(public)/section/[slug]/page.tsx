import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import {
  findSectionPath,
  getArticlesBySection,
  getSections,
  getSectionBySlug,
} from "@/lib/api";
import {
  getSectionHref,
  SECTION_SLUGS_REDIRECT_TO_COLUMNS,
} from "@/lib/navigation";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 12;

type SectionPageProps = {
  params: { slug: string };
  searchParams: { page?: string };
};

export default async function SectionPage({
  params,
  searchParams,
}: SectionPageProps) {
  const { slug } = params;

  if (SECTION_SLUGS_REDIRECT_TO_COLUMNS.has(slug)) {
    redirect("/expertise/columns");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const strapiSection = await getSectionBySlug(slug);
  if (!strapiSection) {
    notFound();
  }

  const tree = await getSections(false);
  const path = findSectionPath(tree, slug);
  if (!path) {
    notFound();
  }

  const current = path[path.length - 1];
  const origin = getStrapiUrl();

  const articlesRes = await getArticlesBySection(slug, page, PAGE_SIZE).catch(
    () => null,
  );

  const articles: Article[] =
    articlesRes?.data?.map((a) => mapStrapiArticleToArticle(a, origin)) ?? [];

  const pageCount = articlesRes?.meta?.pagination?.pageCount ?? 1;

  const paginationNav =
    pageCount > 1 ? (
      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm text-secondary"
        aria-label="Страницы"
      >
        {page > 1 ? (
          <Link
            href={
              page === 2
                ? `/section/${slug}`
                : `/section/${slug}?page=${page - 1}`
            }
            className="font-semibold text-primary transition-colors hover:text-accent"
          >
            Назад
          </Link>
        ) : null}
        <span className="text-muted">
          Страница {page} из {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={`/section/${slug}?page=${page + 1}`}
            className="font-semibold text-primary transition-colors hover:text-accent"
          >
            Вперёд
          </Link>
        ) : null}
      </nav>
    ) : null;

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-primary md:text-4xl lg:text-[2.75rem]">
          {current.name}
        </h1>

        <nav
          className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm text-muted"
          aria-label="Хлебные крошки"
        >
          <Link href="/" className="transition-colors hover:text-accent">
            Главная
          </Link>
          {path.slice(0, -1).map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span aria-hidden className="text-neutral-400">
                /
              </span>
              <Link
                href={getSectionHref(s.slug)}
                className="transition-colors hover:text-accent"
              >
                {s.name}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-neutral-400">
              /
            </span>
            <span className="text-primary">{current.name}</span>
          </span>
        </nav>

        {current.children.length > 0 ? (
          <section className="mt-10" aria-label="Подразделы">
            <h2 className="mb-4 font-heading text-xl font-normal text-primary md:text-2xl">
              Подразделы
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {current.children.map((ch) => (
                <Link
                  key={ch.id}
                  href={getSectionHref(ch.slug)}
                  className="rounded border border-neutral-200 bg-surface px-4 py-3 font-sans text-sm text-primary shadow-sm transition-colors hover:border-accent hover:text-accent"
                >
                  {ch.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <h2 className="mt-12 font-heading text-2xl font-normal text-primary md:text-[1.65rem]">
          Материалы
        </h2>
        <div className="mt-6">
          <ArticleRubricGrid
            embedded
            hideHeading
            articles={articles}
            emptyMessage="В этом разделе пока нет материалов"
          />
        </div>
        {paginationNav}
      </div>
    </main>
  );
}
