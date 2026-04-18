import Link from "next/link";
import type { RegionalReviewItem } from "@/lib/types";

export type RegionalReviewsBlockProps = {
  items: RegionalReviewItem[];
};

function RegionRow({ item }: { item: RegionalReviewItem }) {
  const href = `/articles/${item.article.slug}`;
  return (
    <article className="py-5">
      <p className="font-heading text-[20px] font-bold leading-tight text-ink md:text-[22px]">
        {item.region.name}
      </p>
      <Link
        href={href}
        className="group mt-2 block font-sans text-[15px] leading-snug text-text-mute transition-colors hover:text-ink md:text-[16px]"
      >
        {item.article.title}
      </Link>
    </article>
  );
}

export function RegionalReviewsBlock({ items }: RegionalReviewsBlockProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-paper-warm section-home">
      <div className="container-site">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="h-section">Глобальные обзоры по регионам</h2>
          <Link
            href="/section/globalnye-obzory"
            className="meta text-gold-deep transition-colors hover:text-ink"
          >
            Все обзоры →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:grid-cols-3 [&>article]:relative [&>article]:before:absolute [&>article]:before:left-0 [&>article]:before:right-0 [&>article]:before:top-0 [&>article]:before:h-px [&>article]:before:bg-rule [&>article:nth-child(-n+1)]:before:hidden md:[&>article:nth-child(-n+2)]:before:hidden lg:[&>article:nth-child(-n+3)]:before:hidden">
          {items.map((item) => (
            <RegionRow key={item.region.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
