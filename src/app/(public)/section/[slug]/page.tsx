import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import { SectionRubricFilters } from "@/components/rubric/SectionRubricFilters";
import {
  findSectionPath,
  getArticlesBySection,
  getRegionBySlug,
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
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeHref } from "@/lib/i18n/types";

const PAGE_SIZE = 12;
export const revalidate = 300;

function articlesQuery(page: number, filter?: string, region?: string): string {
  const p = new URLSearchParams();
  if (page > 1) p.set("page", String(page));
  if (filter) p.set("filter", filter);
  if (region) p.set("region", region);
  const s = p.toString();
  return s ? `?${s}` : "";
}

type SectionPageProps = {
  params: { slug: string };
  searchParams: { page?: string; filter?: string; region?: string };
};

export async function generateMetadata({
  params,
}: Pick<SectionPageProps, "params">): Promise<Metadata> {
  const locale = await getServerLocale();
  const section = await getSectionBySlug(params.slug).catch(() => null);
  if (!section) {
    return {
      title: locale === "en" ? "Section not found" : "Рубрика не найдена",
      robots: { index: false, follow: false },
    };
  }
  const name = locale === "en" && section.name_en ? section.name_en : section.name;
  return {
    title: name,
    description:
      locale === "en"
        ? `Articles in "${name}" — United World analytical center.`
        : `Статьи по теме «${name}» — аналитический центр «Единый Мир».`,
    alternates: { canonical: `/section/${params.slug}` },
  };
}

export default async function SectionPage({
  params,
  searchParams,
}: SectionPageProps) {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const { slug } = params;

  if (SECTION_SLUGS_REDIRECT_TO_COLUMNS.has(slug)) {
    redirect("/expertise/columns");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const rawFilter = searchParams.filter?.trim();
  const rawRegion = searchParams.region?.trim();
  const isGlobalReviewsSection = slug === "globalnye-obzory";
  const regionFilter =
    isGlobalReviewsSection && rawRegion ? rawRegion : undefined;

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
  const filterLabel =
    sidebarMode === "filter-by-theme"
      ? dict.search.topicLabel
      : dict.search.regionLabel;
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
    redirect(`/section/${slug}${articlesQuery(page, undefined, regionFilter)}`);
  }

  const articlesRes = await getArticlesBySection(slug, page, PAGE_SIZE, {
    filterSectionSlug: activeFilter,
    regionSlug: regionFilter,
    isGlobalReview: isGlobalReviewsSection,
    locale,
  }).catch(() => null);

  const articles: Article[] =
    articlesRes?.data?.map((a) => mapStrapiArticleToArticle(a, origin, locale)) ?? [];

  const pageCount = articlesRes?.meta?.pagination?.pageCount ?? 1;

  const showSidebar = Boolean(sidebarMode && filterItems.length > 0);

  let headingSuffix: string | null = null;
  if (regionFilter) {
    const regionRes = await getRegionBySlug(regionFilter).catch(() => null);
    if (regionRes) {
      headingSuffix =
        locale === "en" && regionRes.name_en
          ? regionRes.name_en
          : regionRes.name;
    }
  }

  const baseHeading =
    locale === "en" && current.name_en ? current.name_en : current.name;
  const finalHeading = headingSuffix
    ? `${baseHeading}: ${headingSuffix}`
    : baseHeading;

  const paginationNav =
    pageCount > 1 ? (
      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm text-ink-soft"
        aria-label="Страницы"
      >
        {page > 1 ? (
          <Link
            href={localizeHref(
              `/section/${slug}${articlesQuery(page - 1, activeFilter, regionFilter)}`,
              locale,
            )}
            className="font-semibold text-ink transition-colors hover:text-gold-deep"
          >
            Назад
          </Link>
        ) : null}
        <span className="text-text-mute">
          Страница {page} из {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={localizeHref(
              `/section/${slug}${articlesQuery(page + 1, activeFilter, regionFilter)}`,
              locale,
            )}
            className="font-semibold text-ink transition-colors hover:text-gold-deep"
          >
            Вперёд
          </Link>
        ) : null}
      </nav>
    ) : null;

  const subsectionsBlock =
    current.children.length > 0 ? (
      <section className="mt-10" aria-label={dict.section.subsectionsHeading}>
        <h2 className="h-section mb-4">{dict.section.subsectionsHeading}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.children.map((ch) => (
            <Link
              key={ch.id}
              href={localizeHref(getSectionHref(ch.slug), locale)}
              className="rounded border border-neutral-200 bg-paper-warm px-4 py-3 font-sans text-sm text-ink shadow-sm transition-colors hover:border-gold hover:text-gold-deep"
            >
              {locale === "en" ? (ch.name_en || ch.name) : ch.name}
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  const materialsBlock = (
    <>
      <h2 className="h-section mt-16">{dict.section.materialsHeading}</h2>
      <div className="mt-6">
        <ArticleRubricGrid
          embedded
          hideHeading
          articles={articles}
          emptyMessage={dict.rubric.emptyMessage}
          locale={locale}
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
            { name: dict.common.breadcrumbHome, url: localizeHref("/", locale) },
            ...path.map((s) => ({
              name: locale === "en" && s.name_en ? s.name_en : s.name,
              url: localizeHref(getSectionHref(s.slug), locale),
            })),
          ])}
        />

        <nav
          className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12px] text-text-mute"
          aria-label="Хлебные крошки"
        >
          <Link
            href={localizeHref("/", locale)}
            className="transition-colors hover:text-gold-deep"
          >
            {dict.common.breadcrumbHome}
          </Link>
          {path.slice(0, -1).map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span aria-hidden className="text-rule">
                ›
              </span>
              <Link
                href={localizeHref(getSectionHref(s.slug), locale)}
                className="transition-colors hover:text-gold-deep"
              >
                {locale === "en" && s.name_en ? s.name_en : s.name}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span aria-hidden className="text-rule">
              ›
            </span>
            <span className="text-ink/70">{baseHeading}</span>
          </span>
        </nav>

        <h1 className="mt-6 font-heading text-[32px] font-bold leading-tight tracking-tight text-ink md:text-[44px] lg:text-[52px]">
          {finalHeading}
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
