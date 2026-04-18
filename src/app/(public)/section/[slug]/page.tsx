import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { SectionRubricFilters } from "@/components/rubric/SectionRubricFilters";
import {
  findSectionPath,
  getArticlesBySection,
  getSections,
  getSectionBySlug,
} from "@/lib/api";
import {
  getRubricFilterItems,
  getRubricSidebarMode,
  isValidFilterSlug,
} from "@/lib/rubric-filters";
import {
  getSectionHref,
  SECTION_SLUGS_REDIRECT_TO_COLUMNS,
} from "@/lib/navigation";
import { breadcrumbSchema } from "@/lib/schema";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 12;
export const revalidate = 300;

function articlesQuery(page: number, filter?: string): string {
  const p = new URLSearchParams();
  if (page > 1) p.set("page", String(page));
  if (filter) p.set("filter", filter);
  const s = p.toString();
  return s ? `?${s}` : "";
}

type SectionPageProps = {
  params: { slug: string };
  searchParams: { page?: string; filter?: string };
};

export async function generateMetadata({
  params,
}: Pick<SectionPageProps, "params">): Promise<Metadata> {
  const section = await getSectionBySlug(params.slug).catch(() => null);
  if (!section) {
    return {
      title: "Рубрика не найдена",
      robots: { index: false, follow: false },
    };
  }
  const name = section.name;
  return {
    title: name,
    description: `Статьи по теме «${name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/section/${params.slug}` },
  };
}

export default async function SectionPage({
  params,
  searchParams,
}: SectionPageProps) {
  const { slug } = params;

  if (SECTION_SLUGS_REDIRECT_TO_COLUMNS.has(slug)) {
    redirect("/expertise/columns");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const rawFilter = searchParams.filter?.trim();

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

  const sidebarMode = getRubricSidebarMode(path);
  const filterItems = sidebarMode ? getRubricFilterItems(tree, sidebarMode) : [];
  const filterLabel = sidebarMode === "filter-by-theme" ? "Тема" : "Регион";
  const activeFilter =
    sidebarMode && rawFilter && isValidFilterSlug(rawFilter, filterItems)
      ? rawFilter
      : undefined;

  if (
    rawFilter &&
    sidebarMode &&
    filterItems.length > 0 &&
    !isValidFilterSlug(rawFilter, filterItems)
  ) {
    redirect(`/section/${slug}${articlesQuery(page, undefined)}`);
  }

  const articlesRes = await getArticlesBySection(slug, page, PAGE_SIZE, {
    filterSectionSlug: activeFilter,
  }).catch(() => null);

  const articles: Article[] =
    articlesRes?.data?.map((a) => mapStrapiArticleToArticle(a, origin)) ?? [];

  const pageCount = articlesRes?.meta?.pagination?.pageCount ?? 1;

  const showSidebar = Boolean(sidebarMode && filterItems.length > 0);

  const paginationNav =
    pageCount > 1 ? (
      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm text-ink-soft"
        aria-label="Страницы"
      >
        {page > 1 ? (
          <Link
            href={`/section/${slug}${articlesQuery(page - 1, activeFilter)}`}
            className="font-semibold text-ink transition-colors hover:text-gold-deep"
          >
            Назад
          </Link>
        ) : null}
        <span className="text-muted">
          Страница {page} из {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={`/section/${slug}${articlesQuery(page + 1, activeFilter)}`}
            className="font-semibold text-ink transition-colors hover:text-gold-deep"
          >
            Вперёд
          </Link>
        ) : null}
      </nav>
    ) : null;

  const subsectionsBlock =
    current.children.length > 0 ? (
      <section className="mt-10" aria-label="Подразделы">
        <h2 className="h-section mb-4">Подразделы</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.children.map((ch) => (
            <Link
              key={ch.id}
              href={getSectionHref(ch.slug)}
              className="rounded border border-neutral-200 bg-surface px-4 py-3 font-sans text-sm text-ink shadow-sm transition-colors hover:border-gold hover:text-gold-deep"
            >
              {ch.name}
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  const materialsBlock = (
    <>
      <h2 className="h-section mt-16">Материалы</h2>
      <div className="mt-6">
        <ArticleRubricGrid
          embedded
          hideHeading
          articles={articles}
          emptyMessage="В этом разделе пока нет материалов"
        />
      </div>
      {paginationNav}
    </>
  );

  return (
    <main className="min-h-screen bg-paper py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <JsonLd
          data={breadcrumbSchema([
            { name: "Главная", url: "/" },
            ...path.map((s) => ({ name: s.name, url: getSectionHref(s.slug) })),
          ])}
        />

        <nav
          className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12px] text-text-mute"
          aria-label="Хлебные крошки"
        >
          <Link href="/" className="transition-colors hover:text-gold-deep">
            Главная
          </Link>
          {path.slice(0, -1).map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span aria-hidden className="text-rule">
                ›
              </span>
              <Link
                href={getSectionHref(s.slug)}
                className="transition-colors hover:text-gold-deep"
              >
                {s.name}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-rule">
              ›
            </span>
            <span className="text-ink/70">{current.name}</span>
          </span>
        </nav>

        <h1 className="mt-6 font-heading text-[32px] font-bold leading-tight tracking-tight text-ink md:text-[44px] lg:text-[52px]">
          {current.name}
        </h1>

        {showSidebar && sidebarMode ? (
          <div className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:items-start">
            <SectionRubricFilters
              sectionSlug={slug}
              label={filterLabel}
              items={filterItems}
              selectedFilter={activeFilter}
            />
            <div className="min-w-0">
              {subsectionsBlock}
              {materialsBlock}
            </div>
          </div>
        ) : (
          <>
            {subsectionsBlock}
            {materialsBlock}
          </>
        )}
      </div>
    </main>
  );
}
