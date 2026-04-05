import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";

export type LatestArticlesBlockProps = {
  articles: Article[];
};

function formatArticleDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function rubricLabel(article: Article): string {
  return article.categories[0]?.name ?? article.format;
}

const cardHover =
  "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(20,33,61,0.08)]";

const rubricClass =
  "mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-accent";

function FeaturedCard({ article }: { article: Article }) {
  const href = `/articles/${article.slug}`;
  return (
    <article className="flex h-full min-h-0 flex-col bg-white">
      <Link
        href={href}
        className={`group flex h-full min-h-0 flex-col overflow-hidden bg-white outline-none ${cardHover}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 pt-5 md:p-5">
          <span className={rubricClass}>{rubricLabel(article)}</span>
          <h3 className="font-heading text-[22px] font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent md:text-2xl lg:text-[26px]">
            {article.title}
          </h3>
        </div>
      </Link>
    </article>
  );
}

function CompactCard({ article }: { article: Article }) {
  const href = `/articles/${article.slug}`;
  return (
    <article className="flex h-full min-h-0 flex-col bg-white">
      <Link
        href={href}
        className={`group flex h-full min-h-0 flex-col overflow-hidden bg-white outline-none ${cardHover}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-surface">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 pt-4">
          <span className={rubricClass}>{rubricLabel(article)}</span>
          <h3 className="mb-3 flex-1 font-heading text-[17px] font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent">
            {article.title}
          </h3>
          <time
            className="mt-auto font-sans text-[11px] text-muted"
            dateTime={article.publishedAt}
          >
            {formatArticleDate(article.publishedAt)}
          </time>
        </div>
      </Link>
    </article>
  );
}

export function LatestArticlesBlock({ articles }: LatestArticlesBlockProps) {
  const items = articles.slice(0, 4);
  if (items.length === 0) return null;

  const [first, ...rest] = items;

  return (
    <section className="bg-white py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="border-l-4 border-accent pl-4 font-heading text-lg font-normal uppercase tracking-[0.14em] text-primary md:text-xl">
          Свежие материалы
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <div className="min-w-0">
            <FeaturedCard article={first} />
          </div>
          {rest.map((article) => (
            <div key={article.id} className="min-w-0">
              <CompactCard article={article} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
