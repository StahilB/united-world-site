import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLatestArticles } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { localizeHref } from "@/lib/i18n/types";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.notFound.title,
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const sectionLinks: Array<{ href: string; label: string }> = [
    { href: localizeHref("/", locale), label: dict.common.breadcrumbHome },
    { href: localizeHref("/news", locale), label: dict.news.pageTitle },
    { href: localizeHref("/section/analitika", locale), label: locale === "en" ? "Analytics" : "Аналитика" },
    { href: localizeHref("/expertise", locale), label: dict.expertise.title },
    { href: localizeHref("/about", locale), label: locale === "en" ? "About" : "О центре" },
    { href: localizeHref("/search", locale), label: dict.search.title },
  ];
  const origin = getStrapiUrl();
  let articles: Article[] = [];
  try {
    const res = await getLatestArticles(5, locale);
    articles = (res.data ?? []).map((a) => mapStrapiArticleToArticle(a, origin, locale));
  } catch {
    // Strapi недоступен — блок статей просто не показываем
  }

  return (
    <main className="min-h-screen bg-paper-warm py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-4 md:max-w-4xl md:px-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-text-mute">
          {dict.notFound.code}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-normal text-ink md:text-4xl">
          {dict.notFound.title}
        </h1>
        <p className="mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-text-mute">
          {dict.notFound.description}
        </p>

        <section className="mt-10 rounded-sm border border-ink/10 bg-white p-5 md:p-6">
          <h2 className="font-heading text-lg text-ink md:text-xl">{dict.notFound.searchHeading}</h2>
          <form method="get" action={localizeHref("/search", locale)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 font-sans text-sm text-ink">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-mute">
                {dict.notFound.queryLabel}
              </span>
              <input
                type="search"
                name="q"
                placeholder={dict.notFound.queryPlaceholder}
                className="w-full min-h-11 border border-ink/15 bg-white px-3 py-2 text-base text-ink placeholder:text-text-mute focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 shrink-0 bg-ink px-6 font-sans text-[12px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-ink-soft"
            >
              {dict.notFound.submit}
            </button>
          </form>
        </section>

        {articles.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-lg text-ink md:text-xl">Свежие материалы</h2>
            <ul className="mt-4 space-y-4">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={localizeHref(`/articles/${a.slug}`, locale)}
                    className="group flex gap-4 border-b border-ink/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="relative h-[72px] w-[120px] shrink-0 overflow-hidden bg-ink/5">
                      <Image
                        src={a.coverImage}
                        alt=""
                        fill
                        className="object-cover transition-opacity group-hover:opacity-90"
                        sizes="120px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-gold-deep">
                        {a.categories[0]?.name ?? a.format}
                      </p>
                      <p className="mt-1 font-heading text-[15px] font-normal leading-snug text-ink group-hover:text-gold-deep">
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
          <h2 className="font-heading text-lg text-ink md:text-xl">{dict.sitemap.sectionsHeading}</h2>
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Основные разделы">
            {sectionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex border border-ink/15 bg-white px-3 py-2 font-sans text-sm text-ink transition-colors hover:border-gold hover:text-gold-deep"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="mt-12 text-center">
          <Link
            href={localizeHref("/", locale)}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-6 font-sans text-sm font-semibold text-white transition hover:opacity-90"
          >
            {dict.common.backToHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
