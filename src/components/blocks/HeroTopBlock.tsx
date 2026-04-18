import Link from "next/link";
import type {
  GlobalReviewsMainArticle,
  GlobalReviewsPopularArticle,
} from "@/lib/types";

export type HeroTopBlockProps = {
  mainArticle: GlobalReviewsMainArticle;
  popularArticles: GlobalReviewsPopularArticle[];
};

export function HeroTopBlock({ mainArticle, popularArticles }: HeroTopBlockProps) {
  const top = popularArticles.slice(0, 5);

  return (
    <section className="bg-paper-warm section-home">
      <div className="container-site">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          {/* Левая колонка — главный материал */}
          <article className="flex min-w-0 flex-col">
            <p className="kicker">Главное сегодня</p>
            <Link href={mainArticle.href} className="group mt-4 block">
              <h1 className="h-display transition-colors group-hover:text-gold-deep">
                {mainArticle.title}
              </h1>
            </Link>
            <p className="mt-6 lead max-w-xl line-clamp-3">{mainArticle.excerpt}</p>
            <time className="meta mt-6" dateTime={mainArticle.dateIso}>
              {mainArticle.date}
            </time>
          </article>

          {/* Правая колонка — топ читаемых */}
          <aside className="min-w-0 lg:border-l lg:border-rule lg:pl-10">
            <p className="kicker">Сейчас читают</p>
            <ol className="mt-6 space-y-5">
              {top.map((article, i) => (
                <li key={article.href}>
                  <Link href={article.href} className="group flex gap-4">
                    <span className="rank-num w-8 shrink-0" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-1 font-heading text-[16px] font-bold leading-snug text-ink transition-colors group-hover:text-gold-deep md:text-[17px]">
                      {article.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
