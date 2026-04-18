import Image from "next/image";
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
  const hasCover = Boolean(mainArticle.coverImage);

  return (
    <section className="bg-paper-warm section-home">
      <div className="container-site">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Левая колонка — текст статьи (занимает 7 из 12) */}
          <article className="flex min-w-0 flex-col lg:col-span-7">
            <p className="kicker">Главное сегодня</p>
            <Link href={mainArticle.href} className="group mt-4 block">
              <h1 className="h-display transition-colors group-hover:text-gold-deep">
                {mainArticle.title}
              </h1>
            </Link>
            <p className="mt-6 lead max-w-2xl line-clamp-3">{mainArticle.excerpt}</p>
            <time className="meta mt-6" dateTime={mainArticle.dateIso}>
              {mainArticle.date}
            </time>

            {/* Обложка — только если она есть, между текстом и "Сейчас читают"
                на мобильном, а на десктопе уходит в правую колонку */}
            {hasCover && (
              <Link
                href={mainArticle.href}
                className="mt-8 block overflow-hidden lg:hidden"
              >
                <div className="relative aspect-[16/10] w-full bg-paper-mute">
                  <Image
                    src={mainArticle.coverImage as string}
                    alt={mainArticle.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="100vw"
                  />
                </div>
              </Link>
            )}
          </article>

          {/* Правая колонка — обложка сверху + топ-5 под ней.
              Если обложки нет — топ-5 растягивается на всю высоту */}
          <aside className="min-w-0 lg:col-span-5">
            {hasCover && (
              <Link href={mainArticle.href} className="hidden overflow-hidden lg:block">
                <div className="relative aspect-[4/3] w-full bg-paper-mute">
                  <Image
                    src={mainArticle.coverImage as string}
                    alt={mainArticle.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </Link>
            )}

            <div className={hasCover ? "mt-10" : ""}>
              <p className="kicker">Сейчас читают</p>
              <ol className="mt-5 space-y-4">
                {top.map((article, i) => (
                  <li key={article.href}>
                    <Link href={article.href} className="group flex gap-4">
                      <span className="rank-num w-8 shrink-0" aria-hidden>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 pt-1 font-heading text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-gold-deep md:text-[16px]">
                        {article.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
