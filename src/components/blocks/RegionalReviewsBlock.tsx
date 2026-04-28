import Link from "next/link";
import type { RegionalReviewItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { localizeHref } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

export type RegionalReviewsBlockProps = {
  items: RegionalReviewItem[];
  locale?: Locale;
};

function RegionRow({ item, locale }: { item: RegionalReviewItem; locale: Locale }) {
  const articleHref = localizeHref(`/articles/${item.article.slug}`, locale);
  const regionHref = localizeHref(
    `/section/globalnye-obzory?region=${item.region.slug}`,
    locale,
  );
  return (
    <article className="py-5">
      <Link href={regionHref} className="group inline-block">
        <p className="font-heading text-[20px] font-bold leading-tight text-ink transition-colors group-hover:text-gold-deep md:text-[22px]">
          {item.region.name}
        </p>
      </Link>
      <Link
        href={articleHref}
        className="group mt-2 block font-sans text-[15px] leading-snug text-text-mute transition-colors hover:text-ink md:text-[16px]"
      >
        {item.article.title}
      </Link>
    </article>
  );
}

export function RegionalReviewsBlock({
  items,
  locale = "ru",
}: RegionalReviewsBlockProps) {
  const dict = getDictionary(locale);
  if (items.length === 0) return null;

  return (
    <section className="bg-paper-warm section-home">
      <div className="container-site">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <Link
            href={localizeHref("/section/globalnye-obzory", locale)}
            className="inline-block group"
          >
            <h2 className="h-section transition-colors group-hover:text-gold-deep">
              {dict.home.regionalKicker}
            </h2>
          </Link>
          <Link
            href={localizeHref("/section/globalnye-obzory", locale)}
            className="meta text-gold-deep transition-colors hover:text-ink"
          >
            {dict.home.regionalAllLink}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:grid-cols-3 [&>article]:relative [&>article]:before:absolute [&>article]:before:left-0 [&>article]:before:right-0 [&>article]:before:top-0 [&>article]:before:h-px [&>article]:before:bg-rule [&>article:nth-child(-n+1)]:before:hidden md:[&>article:nth-child(-n+2)]:before:hidden lg:[&>article:nth-child(-n+3)]:before:hidden">
          {items.map((item) => (
            <RegionRow key={item.region.slug} item={item} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
