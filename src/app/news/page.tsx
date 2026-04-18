import Link from "next/link";
import type { Metadata } from "next";
import { ArticleRubricGrid } from "@/components/rubric/ArticleRubricGrid";
import {
  findSectionPath,
  getArticlesBySection,
  getSections,
  getSectionBySlug,
} from "@/lib/api";
import { getSectionHref } from "@/lib/navigation";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

const SLUG = "novosti";
const PAGE_SIZE = 12;
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Новости",
  description: "Новости и анонсы аналитического центра «Единый Мир».",
};

type NewsPageProps = {
  searchParams: { page?: string };
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const strapiSection = await getSectionBySlug(SLUG);
  if (!strapiSection) {
    return (
      <main className="min-h-screen bg-white py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h1 className="font-heading text-3xl font-normal text-ink md:text-4xl">
            Новости
          </h1>
          <p className="mt-4 max-w-xl font-sans text-[15px] text-text-mute">
            Раздел «Новости» не найден в Strapi. Выполните{" "}
            <code className="rounded bg-paper-warm px-1 text-sm">npm run seed-sections</code>{" "}
            в каталоге <code className="rounded bg-paper-warm px-1 text-sm">strapi</code>{" "}
            или создайте секцию с slug <code className="rounded bg-paper-warm px-1 text-sm">novosti</code>.
          </p>
        </div>
      </main>
    );
  }

  const tree = await getSections(false);
  const path = findSectionPath(tree, SLUG);
  if (!path) {
    return (
      <main className="min-h-screen bg-white py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h1 className="font-heading text-3xl font-normal text-ink md:text-4xl">
            {strapiSection.name}
          </h1>
          <p className="mt-4 font-sans text-[15px] text-text-mute">
            Раздел не привязан к дереву навигации. Проверьте родителя «О центре» в Strapi.
          </p>
        </div>
      </main>
    );
  }

  const current = path[path.length - 1];
  const origin = getStrapiUrl();

  const articlesRes = await getArticlesBySection(SLUG, page, PAGE_SIZE);

  const articles: Article[] = articlesRes.data.map((a) =>
    mapStrapiArticleToArticle(a, origin),
  );

  const pageCount = articlesRes.meta?.pagination?.pageCount ?? 1;

  const paginationNav =
    pageCount > 1 ? (
      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4 font-sans text-sm text-ink-soft"
        aria-label="Страницы"
      >
        {page > 1 ? (
          <Link
            href={page === 2 ? "/news" : `/news?page=${page - 1}`}
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
            href={`/news?page=${page + 1}`}
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
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
          {current.name}
        </h1>

        <nav
          className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm text-text-mute"
          aria-label="Хлебные крошки"
        >
          <Link href="/" className="transition-colors hover:text-gold-deep">
            Главная
          </Link>
          {path.slice(0, -1).map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <span aria-hidden className="text-neutral-400">
                /
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
            <span aria-hidden className="text-neutral-400">
              /
            </span>
            <span className="text-ink">{current.name}</span>
          </span>
        </nav>

        <h2 className="mt-12 font-heading text-2xl font-normal text-ink md:text-[1.65rem]">
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
