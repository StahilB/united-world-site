import Image from "next/image";
import Link from "next/link";
import { formatDateRu } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

const cardHover =
  "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(20,33,61,0.08)]";

const rubricClass =
  "mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-accent";

function rubricLabel(article: Article): string {
  return article.categories[0]?.name ?? article.format;
}

export type ArticleRubricGridProps = {
  /** Заголовок страницы рубрики (Playfair Display) */
  heading: string;
  articles: Article[];
  /** Временная диагностика Strapi (URL + число записей в ответе) */
  debug?: { requestUrl: string; rawCount: number };
  /** Текст при пустом списке (по умолчанию — общий для рубрик) */
  emptyMessage?: string;
};

export function ArticleRubricGrid({
  heading,
  articles,
  debug,
  emptyMessage = "В этой рубрике пока нет материалов",
}: ArticleRubricGridProps) {
  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-primary md:text-4xl lg:text-[2.75rem]">
          {heading}
        </h1>

        {debug ? (
          <div className="mt-6 rounded-md border border-dashed border-neutral-300 bg-surface px-4 py-3 font-mono text-xs text-secondary break-all">
            <div>
              <span className="font-semibold text-primary">Запрос:</span>{" "}
              {debug.requestUrl}
            </div>
            <div className="mt-2">
              <span className="font-semibold text-primary">Статей в ответе:</span>{" "}
              {debug.rawCount}
            </div>
          </div>
        ) : null}

        {articles.length === 0 ? (
          <p className="mt-10 font-sans text-base text-muted">{emptyMessage}</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {articles.map((article) => {
              const href = `/articles/${article.slug}`;
              return (
                <article
                  key={article.id}
                  className="flex h-full min-h-0 flex-col bg-white"
                >
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
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-4 pt-5 md:p-5">
                      <span className={rubricClass}>{rubricLabel(article)}</span>
                      <h2 className="font-heading text-xl font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent md:text-[22px]">
                        {article.title}
                      </h2>
                      <time
                        className="mt-3 font-sans text-[12px] text-muted"
                        dateTime={article.publishedAt}
                      >
                        {formatDateRu(article.publishedAt)}
                      </time>
                      <p className="mt-2 font-sans text-sm text-secondary">
                        {article.author.name}
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
