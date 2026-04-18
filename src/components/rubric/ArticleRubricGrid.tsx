import Image from "next/image";
import Link from "next/link";
import { formatDateRu } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

function rubricLabel(article: Article): string {
  return article.categories[0]?.name ?? article.format;
}

export type ArticleRubricGridProps = {
  heading?: string;
  articles: Article[];
  emptyMessage?: string;
  embedded?: boolean;
  hideHeading?: boolean;
};

export function ArticleRubricGrid({
  articles,
  emptyMessage = "В этой рубрике пока нет материалов",
  embedded = false,
  hideHeading = false,
  heading = "",
}: ArticleRubricGridProps) {
  const inner = (
    <div
      className={
        embedded ? "mx-auto max-w-6xl" : "mx-auto max-w-6xl px-6 md:px-8"
      }
    >
      {!hideHeading ? (
        <h1 className="font-heading text-[32px] font-bold leading-tight tracking-tight text-ink md:text-[44px] lg:text-[52px]">
          {heading}
        </h1>
      ) : null}

      {articles.length === 0 ? (
        <p
          className={`font-sans text-[15px] text-text-mute ${
            hideHeading ? "mt-0" : "mt-10"
          }`}
        >
          {emptyMessage}
        </p>
      ) : (
        <div
          className={`grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 ${
            hideHeading ? "mt-0" : "mt-12"
          }`}
        >
          {articles.map((article) => {
            const href = `/articles/${article.slug}`;
            return (
              <article
                key={article.id}
                className="flex h-full min-w-0 flex-col"
              >
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
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="kicker mt-4 line-clamp-1">
                      {rubricLabel(article)}
                    </p>
                    <h2 className="mt-2 font-heading text-[19px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold-deep md:text-[20px]">
                      {article.title}
                    </h2>
                    <time
                      className="meta mt-auto block pt-4"
                      dateTime={article.publishedAt}
                    >
                      {formatDateRu(article.publishedAt)}
                    </time>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <main className="min-h-screen bg-paper py-12 md:py-16">{inner}</main>
  );
}
