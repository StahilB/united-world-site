import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLatestArticles } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: true },
};

const SECTION_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Главная" },
  { href: "/news", label: "Новости" },
  { href: "/section/analitika", label: "Аналитика" },
  { href: "/expertise", label: "Экспертиза" },
  { href: "/about", label: "О центре" },
  { href: "/search", label: "Поиск" },
];

export default async function NotFound() {
  const origin = getStrapiUrl();
  let articles: Article[] = [];
  try {
    const res = await getLatestArticles(5);
    articles = (res.data ?? []).map((a) => mapStrapiArticleToArticle(a, origin));
  } catch {
    // Strapi недоступен — блок статей просто не показываем
  }

  return (
    <main className="min-h-screen bg-surface py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-4 md:max-w-4xl md:px-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Ошибка 404
        </p>
        <h1 className="mt-2 font-heading text-3xl font-normal text-primary md:text-4xl">
          Страница не найдена
        </h1>
        <p className="mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-muted">
          Ссылка устарела или адрес введён с опечаткой. Попробуйте поиск или перейдите в
          разделы ниже.
        </p>

        <section className="mt-10 rounded-sm border border-primary/10 bg-white p-5 md:p-6">
          <h2 className="font-heading text-lg text-primary md:text-xl">Поиск по сайту</h2>
          <form method="get" action="/search" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 font-sans text-sm text-primary">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Запрос
              </span>
              <input
                type="search"
                name="q"
                placeholder="Ключевые слова"
                className="w-full min-h-11 border border-primary/15 bg-white px-3 py-2 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 shrink-0 bg-primary px-6 font-sans text-[12px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-secondary"
            >
              Найти
            </button>
          </form>
        </section>

        {articles.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-lg text-primary md:text-xl">Свежие материалы</h2>
            <ul className="mt-4 space-y-4">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/articles/${a.slug}`}
                    className="group flex gap-4 border-b border-primary/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="relative h-[72px] w-[120px] shrink-0 overflow-hidden bg-primary/5">
                      <Image
                        src={a.coverImage}
                        alt=""
                        fill
                        className="object-cover transition-opacity group-hover:opacity-90"
                        sizes="120px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-accent">
                        {a.categories[0]?.name ?? a.format}
                      </p>
                      <p className="mt-1 font-heading text-[15px] font-normal leading-snug text-primary group-hover:text-accent">
                        {a.title}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-heading text-lg text-primary md:text-xl">Разделы</h2>
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Основные разделы">
            {SECTION_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex border border-primary/15 bg-white px-3 py-2 font-sans text-sm text-primary transition-colors hover:border-accent hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-6 font-sans text-sm font-semibold text-white transition hover:opacity-90"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
