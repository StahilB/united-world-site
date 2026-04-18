import Link from "next/link";
import type {
  GlobalReviewsMainArticle,
  GlobalReviewsPopularArticle,
} from "@/lib/types";

const COL_BORDER = "border-[#E5E5E5]";
const SECTION_BG = "bg-[#FFF8F0]";

export type GlobalReviewsBlockProps = {
  mainArticle: GlobalReviewsMainArticle;
  popularArticles: GlobalReviewsPopularArticle[];
};

function PopularList({
  items,
  startIndex,
}: {
  items: GlobalReviewsPopularArticle[];
  startIndex: number;
}) {
  return (
    <ul className="space-y-4">
      {items.map((article, i) => {
        const n = startIndex + i;
        return (
          <li key={`${article.href}-${n}`}>
            <Link
              href={article.href}
              className="group flex gap-2.5 text-left transition-colors"
            >
              <span
                className="font-heading text-[1.75rem] leading-[1.1] tabular-nums text-ink/20 transition-colors group-hover:text-ink/30 md:text-[2rem]"
                aria-hidden
              >
                {n}
              </span>
              <span className="min-w-0 flex-1 pt-0.5 font-sans text-[13px] leading-snug text-text group-hover:text-accent">
                {article.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MainArticleBlock({ article }: { article: GlobalReviewsMainArticle }) {
  return (
    <article>
      <Link href={article.href} className="group block">
        <h3 className="font-heading text-[28px] font-normal leading-tight tracking-tight text-ink transition-colors group-hover:text-accent sm:text-[32px]">
          {article.title}
        </h3>
      </Link>
      <p className="mt-3 font-sans text-base leading-relaxed text-muted line-clamp-2">
        {article.excerpt}
      </p>
      <time
        className="mt-3 block font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        dateTime={article.dateIso}
      >
        {article.date}
      </time>
    </article>
  );
}

export function GlobalReviewsBlock({
  mainArticle,
  popularArticles,
}: GlobalReviewsBlockProps) {
  const mid = Math.ceil(popularArticles.length / 2);
  const leftPopular = popularArticles.slice(0, mid);
  const rightPopular = popularArticles.slice(mid);

  return (
    <section className={`${SECTION_BG} py-10 md:py-12`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="border-l-4 border-accent pl-4 font-heading text-lg font-normal uppercase tracking-[0.14em] text-ink md:text-xl">
          Самое читаемое
        </h2>

        {/* Mobile: главная статья, затем весь список популярного */}
        <div className="mt-8 space-y-10 lg:hidden">
          <MainArticleBlock article={mainArticle} />
          <div>
            <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Самое читаемое
            </p>
            <PopularList items={popularArticles} startIndex={1} />
          </div>
        </div>

        {/* Desktop: три колонки 25% / 50% / 25% */}
        <div className="mt-10 hidden gap-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <div className={`border-r ${COL_BORDER} pr-6`}>
            <p className="mb-5 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Самое читаемое
            </p>
            <PopularList items={leftPopular} startIndex={1} />
          </div>

          <div className={`border-r ${COL_BORDER} px-6`}>
            <MainArticleBlock article={mainArticle} />
          </div>

          <div className="pl-6">
            <p
              className="invisible mb-5 font-heading text-xs font-semibold uppercase tracking-[0.18em] select-none"
              aria-hidden
            >
              Самое читаемое
            </p>
            <PopularList
              items={rightPopular}
              startIndex={leftPopular.length + 1}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
