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

function ArticleCard({
  article,
  emphasized,
  priority,
}: {
  article: Article;
  emphasized?: boolean;
  priority?: boolean;
}) {
  const href = `/articles/${article.slug}`;
  const titleClass = emphasized
    ? "mt-3 font-heading text-[22px] font-bold leading-[1.2] tracking-tight text-ink transition-colors group-hover:text-gold-deep lg:text-[24px]"
    : "mt-3 font-heading text-[17px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold-deep";

  return (
    <article className="flex h-full min-w-0 flex-col">
      <Link
        href={href}
        className="group flex h-full flex-col transition-[transform] duration-200 ease-out hover:-translate-y-[2px]"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-mute">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <p className="kicker mt-4">{rubricLabel(article)}</p>
          <h3 className={titleClass}>{article.title}</h3>
          <time className="meta mt-auto block pt-4" dateTime={article.publishedAt}>
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

  return (
    <section className="bg-paper section-home">
      <div className="container-site">
        <h2 className="h-section">Свежие материалы</h2>

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {items.map((article, i) => (
            <ArticleCard
              key={article.id}
              article={article}
              emphasized={i === 0}
              priority={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
