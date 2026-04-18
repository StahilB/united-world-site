import Link from "next/link";
import type { Metadata } from "next";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import {
  getAuthors,
  getCategories,
  getRegions,
  searchArticles,
} from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";
import { SearchForm } from "./SearchForm";

export const metadata: Metadata = {
  title: "Поиск по сайту",
  description: "Поиск материалов аналитического центра «Единый Мир».",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function parseFormats(
  raw: string | string[] | undefined,
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function pickString(
  v: string | string[] | undefined,
): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? "";
  return "";
}

type SearchPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function buildQuery(
  base: Record<string, string | string[] | undefined>,
  overrides: { page?: number },
): string {
  const p = new URLSearchParams();
  const q = pickString(base.q);
  if (q) p.set("q", q);
  const formats = parseFormats(base.format);
  formats.forEach((f) => p.append("format", f));
  const region = pickString(base.region);
  if (region) p.set("region", region);
  const category = pickString(base.category);
  if (category) p.set("category", category);
  const author = pickString(base.author);
  if (author) p.set("author", author);
  const dateFrom = pickString(base.dateFrom);
  if (dateFrom) p.set("dateFrom", dateFrom);
  const dateTo = pickString(base.dateTo);
  if (dateTo) p.set("dateTo", dateTo);
  const page =
    overrides.page ??
    Math.max(1, parseInt(pickString(base.page) || "1", 10) || 1);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = pickString(searchParams.q);
  const formats = parseFormats(searchParams.format);
  const region = pickString(searchParams.region);
  const category = pickString(searchParams.category);
  const author = pickString(searchParams.author);
  const dateFrom = pickString(searchParams.dateFrom);
  const dateTo = pickString(searchParams.dateTo);
  const page = Math.max(1, parseInt(pickString(searchParams.page) || "1", 10) || 1);

  const [regionsRes, categoriesRes, authorsRes] = await Promise.all([
    getRegions().catch(() => ({ data: [] })),
    getCategories().catch(() => ({ data: [] })),
    getAuthors().catch(() => ({ data: [] })),
  ]);

  const regions = (regionsRes.data ?? [])
    .map((r) => ({ slug: r.slug, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const categories = (categoriesRes.data ?? [])
    .map((c) => ({ slug: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const authors = (authorsRes.data ?? [])
    .map((a) => ({ slug: a.slug, name: a.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const res = await searchArticles({
    q: q || undefined,
    formats,
    region: region || undefined,
    category: category || undefined,
    author: author || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const origin = getStrapiUrl();
  const articles: Article[] = res.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const pagination = res.meta?.pagination;
  const pageCount = pagination?.pageCount ?? 1;

  const paginationNav =
    pageCount > 1 ? (
      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm text-ink-soft"
        aria-label="Страницы"
      >
        {page > 1 ? (
          <Link
            href={`/search${buildQuery(searchParams, { page: page - 1 })}`}
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
            href={`/search${buildQuery(searchParams, { page: page + 1 })}`}
            className="font-semibold text-ink transition-colors hover:text-gold-deep"
          >
            Вперёд
          </Link>
        ) : null}
      </nav>
    ) : null;

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
          Поиск
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-[15px] leading-relaxed text-text-mute">
          Укажите запрос и при необходимости сузьте выборку фильтрами. Параметры
          сохраняются в адресе страницы — ссылку можно передать коллегам.
        </p>

        <div className="mt-8 rounded-sm border border-ink/10 bg-surface/40 p-4 md:p-6">
          <SearchForm
            defaults={{
              q,
              formats,
              region,
              category,
              author,
              dateFrom,
              dateTo,
            }}
            regions={regions}
            categories={categories}
            authors={authors}
          />
        </div>

        <h2 className="mt-12 font-heading text-2xl font-normal text-ink md:text-[1.65rem]">
          Результаты
        </h2>
        <div className="mt-6">
          <ArticleRubricGrid
            embedded
            hideHeading
            articles={articles}
            emptyMessage="Нет статей по заданным условиям. Измените запрос или фильтры."
          />
        </div>
        {paginationNav}
      </div>
    </main>
  );
}
