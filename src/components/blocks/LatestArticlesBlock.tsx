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
  "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[2px]";

function FeaturedCard({ article, priority }: { article: Article; priority?: boolean }) {
  const href = `/articles/${article.slug}`;
  return (
    <article className="min-w-0">
      <Link href={href} className={`group block ${cardHover}`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-warm">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            priority={priority}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        </div>
        <p className="kicker mt-5">{rubricLabel(article)}</p>
        <h3 className="mt-3 font-heading text-[26px] font-bold leading-[1.2] tracking-tight text-ink transition-colors group-hover:text-gold-deep md:text-[28px]">
          {article.title}
        </h3>
        <time className="meta mt-4 block" dateTime={article.publishedAt}>
          {formatArticleDate(article.publishedAt)}
        </time>
      </Link>
    </article>
  );
}

function CompactCard({ article }: { article: Article }) {
  const href = `/articles/${article.slug}`;
  return (
    <article className="min-w-0">
      <Link href={href} className={`group block ${cardHover}`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-warm">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <p className="kicker mt-4">{rubricLabel(article)}</p>
        <h3 className="mt-2 font-heading text-[18px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold-deep md:text-[19px]">
          {article.title}
        </h3>
        <time className="meta mt-3 block" dateTime={article.publishedAt}>
          {formatArticleDate(article.publishedAt)}
        </time>
      </Link>
    </article>
  );
}

export function LatestArticlesBlock({ articles }: LatestArticlesBlockProps) {
  const items = articles.slice(0, 4);
  if (items.length === 0) return null;
  const [first, ...rest] = items;

  return (
    <section className="bg-paper section-home">
      <div className="container-site">
        <h2 className="h-section">Свежие материалы</h2>

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Крупная первая — на десктопе занимает 2 колонки из 3 */}
          <div className="lg:col-span-2">
            <FeaturedCard article={first} priority />
          </div>
          {/* Три компактных справа вертикально на десктопе */}
          <div className="flex flex-col gap-8 lg:col-span-1">
            {rest.slice(0, 3).map((article) => (
              <CompactCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
