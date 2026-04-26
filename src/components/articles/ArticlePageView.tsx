import Image from "next/image";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author/AuthorAvatar";
import { SOCIAL_URLS } from "@/components/ui/SocialIcons";
import type { Article } from "@/lib/types";
import type { TocHeading } from "@/lib/article-content";
import { replaceImgWithNextImage } from "@/lib/article-content";
import { formatDate } from "@/lib/strapi-mappers";
import type { Locale } from "@/lib/i18n/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizeHref } from "@/lib/i18n/types";
import { ArticleTableOfContents } from "./ArticleTableOfContents";

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
  locale: Locale;
  dict: Dictionary;
};

function RelatedCard({ article: a, locale }: { article: Article; locale: Locale }) {
  return (
    <Link
      href={localizeHref(`/articles/${a.slug}`, locale)}
      className="group block border-b border-rule pb-5 last:border-b-0 last:pb-0"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-paper-mute">
        <Image
          src={a.coverImage}
          alt=""
          fill
          className="object-cover transition-opacity group-hover:opacity-90"
          sizes="(max-width: 1024px) 100vw, 260px"
        />
      </div>
      <p className="kicker mt-3 line-clamp-1">
        {a.categories[0]?.name ?? a.format}
      </p>
      <p className="mt-1.5 font-heading text-[15px] font-bold leading-snug text-ink group-hover:text-gold-deep">
        {a.title}
      </p>
    </Link>
  );
}

function SimilarCardWide({ article: a, locale }: { article: Article; locale: Locale }) {
  return (
    <Link
      href={localizeHref(`/articles/${a.slug}`, locale)}
      className="group flex min-w-0 flex-col overflow-hidden bg-paper-warm transition-[transform] duration-200 ease-out hover:-translate-y-[2px] md:flex-row"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 md:aspect-[4/3] md:w-[40%]">
        <Image
          src={a.coverImage}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 md:p-5">
        <p className="kicker line-clamp-1">
          {a.categories[0]?.name ?? a.format}
        </p>
        <h3 className="mt-2 font-heading text-[15px] font-bold leading-[1.25] tracking-tight text-ink transition-colors group-hover:text-gold-deep md:text-[16px] line-clamp-4">
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
  locale,
  dict,
}: ArticlePageViewProps) {
  const primaryCategory = article.categories[0];
  const firstSection = article.sections?.[0];
  const breadcrumbSectionLabel =
    firstSection?.name ?? primaryCategory?.name ?? article.format;
  const breadcrumbSectionHref = firstSection
      ? localizeHref(`/section/${firstSection.slug}`, locale)
    : primaryCategory
      ? localizeHref(`/category/${primaryCategory.slug}`, locale)
      : localizeHref("/news", locale);
  const articleChunks = replaceImgWithNextImage(html);

  return (
    <main className="bg-paper pb-20 pt-6 md:pt-10">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Хлебные крошки */}
        <nav
          className="font-sans text-[12px] text-text-mute"
          aria-label={dict.common.breadcrumbHome}
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={localizeHref("/", locale)} className="transition-colors hover:text-gold-deep">
                {dict.common.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden className="text-rule">
              ›
            </li>
            <li>
              <Link
                href={breadcrumbSectionHref}
                className="transition-colors hover:text-gold-deep"
              >
                {breadcrumbSectionLabel}
              </Link>
            </li>
            <li aria-hidden className="text-rule">
              ›
            </li>
            <li className="text-ink/70">{truncateTitle(article.title)}</li>
          </ol>
        </nav>

        {/* Kicker-рубрика */}
        {primaryCategory && (
          <Link
            href={localizeHref(`/category/${primaryCategory.slug}`, locale)}
            className="kicker mt-8 inline-block transition-colors hover:text-ink"
          >
            {primaryCategory.name}
          </Link>
        )}

        {/* Заголовок — крупный, жирный, газетный */}
        <h1 className="mt-4 max-w-[900px] font-heading text-[32px] font-bold leading-[1.1] tracking-tight text-ink md:text-[44px] lg:text-[52px]">
          {article.title}
        </h1>

        {/* Лид / excerpt — если есть */}
        {article.excerpt && (
          <p className="mt-6 max-w-[760px] font-sans text-[18px] leading-[1.55] text-text-mute md:text-[20px]">
            {article.excerpt}
          </p>
        )}

        {/* Мета-строка: автор + дата + время чтения одной линией */}
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-6 font-sans text-[13px] text-text-mute">
          <div className="flex items-center gap-2.5">
            <AuthorAvatar
              name={article.author.name}
              slug={article.author.slug}
              avatarUrl={article.author.avatarUrl}
              size={32}
            />
            <Link
              href={localizeHref(`/author/${article.author.slug}`, locale)}
              className="font-semibold text-ink transition-colors hover:text-gold-deep"
            >
              {article.author.name}
            </Link>
          </div>
          <span aria-hidden className="text-rule">
            ·
          </span>
          <time dateTime={article.publishedAt}>
            {formatDate(article.publishedAt, locale)}
          </time>
          <span aria-hidden className="text-rule">
            ·
          </span>
          <span>{dict.common.readingMin(article.readingTime)}</span>
        </div>

        {/* Обложка */}
        {article.coverImage && !article.coverImage.includes("picsum") && (
          <div className="relative mt-10 aspect-video w-full overflow-hidden bg-paper-mute">
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
            >
              {articleChunks.map((chunk, idx) =>
                chunk.type === "html" ? (
                  <div
                    key={`html-${idx}`}
                    dangerouslySetInnerHTML={{ __html: chunk.html }}
                  />
                ) : (
                  <figure
                    key={`img-${idx}`}
                    className={`my-6 ${chunk.className ?? ""}`.trim()}
                    style={chunk.style}
                    data-decoding={chunk.decoding}
                  >
                    <Image
                      src={chunk.src}
                      alt={chunk.alt}
                      width={chunk.width}
                      height={chunk.height}
                      loading={chunk.loading}
                      sizes="(max-width: 1152px) 100vw, 900px"
                      className="h-auto w-full object-cover"
                    />
                  </figure>
                ),
              )}
            </article>

            {/* Блок автора внизу */}
            <section
              className="mt-16 max-w-[720px] border-t border-rule pt-10"
              aria-labelledby="author-bottom"
            >
              <h2 id="author-bottom" className="sr-only">
                {dict.article.authorBlockKicker}
              </h2>
              <p className="kicker">{dict.article.authorBlockKicker}</p>
              <div className="mt-4 flex gap-5">
                <AuthorAvatar
                  name={article.author.name}
                  slug={article.author.slug}
                  avatarUrl={article.author.avatarUrl}
                  size={72}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={localizeHref(`/author/${article.author.slug}`, locale)}
                    className="font-heading text-[22px] font-bold text-ink transition-colors hover:text-gold-deep"
                  >
                    {article.author.name}
                  </Link>
                  {article.author.bio && (
                    <p className="mt-2 font-sans text-[15px] leading-relaxed text-text-mute">
                      {article.author.bio}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Теги */}
            {tags.length > 0 && (
              <div className="mt-12 max-w-[720px]">
                <p className="kicker">{dict.article.tagsKicker}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li key={tag}>
                      <span className="inline-block bg-paper-warm px-3 py-1.5 font-sans text-[12px] text-text">
                        {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Похожие */}
            {similar.length > 0 && (
              <section className="mt-14 max-w-[700px]" aria-labelledby="similar">
                <h2
                  id="similar"
                  className="font-heading text-xl text-ink md:text-2xl"
                >
                  {dict.article.similarArticles}
                </h2>
                <div className="mt-6 space-y-6">
                  {similar.map((a) => (
                    <SimilarCardWide key={a.id} article={a} locale={locale} />
                  ))}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-14 max-w-[900px]" aria-labelledby="read-more-bottom">
                <h2
                  id="read-more-bottom"
                  className="font-heading text-xl text-ink md:text-2xl"
                >
                  {dict.article.readAlso}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {related.map((a) => (
                    <SimilarCardWide key={a.id} article={a} locale={locale} />
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
                  <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-text-mute">
                    {dict.article.readAlso}
                  </p>
                  <div className="mt-4 space-y-6">
                    {readAlso.map((a) => (
                      <RelatedCard key={a.id} article={a} locale={locale} />
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-ink-deep p-5 text-white">
                <p className="kicker text-gold-light">{dict.article.telegramSubscribe}</p>
                <p className="mt-3 font-heading text-[17px] font-bold leading-snug">
                  {dict.article.telegramTitle}
                </p>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/70">
                  {dict.article.telegramDescription}
                </p>
                <a
                  href={SOCIAL_URLS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-10 items-center justify-center bg-gold px-4 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-gold-light"
                >
                  {dict.article.telegramButton}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
