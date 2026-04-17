import Image from "next/image";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author/AuthorAvatar";
import { SOCIAL_URLS } from "@/components/ui/SocialIcons";
import type { Article } from "@/lib/types";
import type { TocHeading } from "@/lib/article-content";
import { ArticleTableOfContents } from "./ArticleTableOfContents";

function formatPublished(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function truncateTitle(title: string, max = 48): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max).trim()}…`;
}

type ArticlePageViewProps = {
  article: Article;
  html: string;
  toc: TocHeading[];
  readAlso: Article[];
  similar: Article[];
  related: Article[];
  tags: string[];
};

function RelatedCard({ article: a }: { article: Article }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group block border-b border-primary/10 pb-5 last:border-b-0 last:pb-0"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-surface">
        <Image
          src={a.coverImage}
          alt=""
          fill
          className="object-cover transition-opacity group-hover:opacity-90"
          sizes="(max-width: 1024px) 100vw, 200px"
        />
      </div>
      <p className="mt-2 font-heading text-[15px] font-normal leading-snug text-primary group-hover:text-accent">
        {a.title}
      </p>
      <p className="mt-1 font-sans text-[11px] text-muted">{a.format}</p>
    </Link>
  );
}

function SimilarCardWide({ article: a }: { article: Article }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group flex flex-col border border-primary/10 bg-white md:flex-row"
    >
      <div className="relative aspect-video min-h-[120px] w-full shrink-0 md:w-[40%]">
        <Image
          src={a.coverImage}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center p-4">
        <span
          className="font-sans text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: a.categories[0]?.color ?? "#B8952C" }}
        >
          {a.categories[0]?.name ?? a.format}
        </span>
        <h3 className="mt-2 font-heading text-lg font-normal leading-snug text-primary group-hover:text-accent">
          {a.title}
        </h3>
      </div>
    </Link>
  );
}

export function ArticlePageView({
  article,
  html,
  toc,
  readAlso,
  similar,
  related,
  tags,
}: ArticlePageViewProps) {
  const primaryCategory = article.categories[0];
  const firstSection = article.sections?.[0];
  const breadcrumbSectionLabel =
    firstSection?.name ?? primaryCategory?.name ?? article.format;
  const breadcrumbSectionHref = firstSection
    ? `/section/${firstSection.slug}`
    : primaryCategory
      ? `/category/${primaryCategory.slug}`
      : "/articles";

  return (
    <main className="bg-surface pb-20 pt-6 md:pt-10">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Хлебные крошки: Главная → раздел (Section) → статья */}
        <nav
          className="font-sans text-[12px] text-muted"
          aria-label="Навигация по разделам"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-accent">
                Главная
              </Link>
            </li>
            <li aria-hidden className="text-primary/35">
              ›
            </li>
            <li>
              <Link href="/analytics" className="hover:text-accent">
                Аналитика
              </Link>
            </li>
            <li aria-hidden className="text-primary/35">
              ›
            </li>
            <li>
              <Link href={breadcrumbSectionHref} className="hover:text-accent">
                {breadcrumbSectionLabel}
              </Link>
            </li>
            <li aria-hidden className="text-primary/35">
              ›
            </li>
            <li className="text-primary/80">{truncateTitle(article.title)}</li>
          </ol>
        </nav>

        {/* Мета */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-[13px]">
          {primaryCategory && (
            <span
              className="font-semibold uppercase tracking-wide"
              style={{ color: primaryCategory.color }}
            >
              {primaryCategory.name}
            </span>
          )}
          <time dateTime={article.publishedAt} className="text-muted">
            {formatPublished(article.publishedAt)}
          </time>
          <span className="text-muted">
            · {article.readingTime} мин чтения
          </span>
        </div>

        {/* Заголовок */}
        <h1 className="mx-auto mt-6 max-w-[800px] font-heading text-[32px] font-normal leading-tight tracking-tight text-primary md:text-[40px] md:leading-[1.15] lg:text-[42px]">
          {article.title}
        </h1>

        {/* Автор (шапка) */}
        <div className="mt-6 flex items-center gap-3">
          <AuthorAvatar
            name={article.author.name}
            slug={article.author.slug}
            avatarUrl={article.author.avatarUrl}
            size={40}
          />
          <div className="font-sans text-[14px]">
            <span className="text-muted">Автор: </span>
            <Link
              href={`/author/${article.author.slug}`}
              className="font-medium text-primary underline decoration-primary/20 underline-offset-2 hover:text-accent"
            >
              {article.author.name}
            </Link>
          </div>
        </div>

        {/* Обложка */}
        {article.coverImage && !article.coverImage.includes("picsum") && (
          <div className="relative mt-8 aspect-video w-full overflow-hidden bg-primary/5">
            <Image
              src={article.coverImage}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
          </div>
        )}

        {/* Двухколоночный layout */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:mt-12 lg:grid-cols-[minmax(0,65fr)_minmax(0,30fr)] lg:gap-10 xl:gap-14">
          <div className="min-w-0">
            <article
              className="article-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Блок автора внизу */}
            <section
              className="mt-14 max-w-[700px] border-t border-primary/15 pt-10"
              aria-labelledby="author-bottom"
            >
              <h2 id="author-bottom" className="sr-only">
                Об авторе
              </h2>
              <div className="flex gap-4">
                <AuthorAvatar
                  name={article.author.name}
                  slug={article.author.slug}
                  avatarUrl={article.author.avatarUrl}
                  size={64}
                />
                <div>
                  <Link
                    href={`/author/${article.author.slug}`}
                    className="font-heading text-xl text-primary hover:text-accent"
                  >
                    {article.author.name}
                  </Link>
                  <p className="mt-2 font-sans text-[15px] leading-relaxed text-muted">
                    {article.author.bio}
                  </p>
                </div>
              </div>
            </section>

            {/* Теги */}
            <div className="mt-10 max-w-[700px]">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Теги
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-block border border-primary/15 bg-white px-2.5 py-1 font-sans text-[12px] text-primary/85">
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Похожие */}
            {similar.length > 0 && (
              <section className="mt-14 max-w-[700px]" aria-labelledby="similar">
                <h2
                  id="similar"
                  className="font-heading text-xl text-primary md:text-2xl"
                >
                  Похожие статьи
                </h2>
                <div className="mt-6 space-y-6">
                  {similar.map((a) => (
                    <SimilarCardWide key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-14 max-w-[900px]" aria-labelledby="read-more-bottom">
                <h2
                  id="read-more-bottom"
                  className="font-heading text-xl text-primary md:text-2xl"
                >
                  Читайте также
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {related.map((a) => (
                    <SimilarCardWide key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <div className="space-y-8">
              <ArticleTableOfContents headings={toc} />

              {readAlso.length > 0 && (
                <div>
                  <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Читайте также
                  </p>
                  <div className="mt-4 space-y-6">
                    {readAlso.map((a) => (
                      <RelatedCard key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-sm border border-primary/10 bg-white p-4">
                <p className="font-heading text-sm text-primary">
                  Подписка в Telegram
                </p>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted">
                  Краткие выжимки материалов и анонсы — без лишнего шума.
                </p>
                <a
                  href={SOCIAL_URLS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-10 items-center justify-center bg-[#229ED9] px-4 font-sans text-[12px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                >
                  Telegram
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
