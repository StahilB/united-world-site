import Image from "next/image";
import Link from "next/link";
import type { RegionalReviewItem } from "@/lib/types";

export type RegionalReviewsBlockProps = {
  items: RegionalReviewItem[];
};

function RegionalCard({ item }: { item: RegionalReviewItem }) {
  const href = `/articles/${item.article.slug}`;
  return (
    <article className="flex w-full justify-center">
      <Link
        href={href}
        className="group relative block w-full max-w-[220px] overflow-hidden bg-black/30"
      >
        <div className="relative aspect-[4/3] w-full">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={item.article.coverImage}
              alt={item.article.title}
              fill
              className="object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8">
            <p className="font-sans text-[14px] font-bold leading-tight text-white">
              {item.region.name}
            </p>
            <p className="mt-1 font-sans text-[12px] leading-snug text-white line-clamp-2">
              {item.article.title}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function RegionalReviewsBlock({ items }: RegionalReviewsBlockProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-[#0F1B2D] py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="border-l-4 border-accent pl-4 font-heading text-lg font-normal uppercase tracking-[0.14em] text-white md:text-xl">
          Ежемесячные обзоры по регионам
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-5 lg:gap-4">
          {items.map((item) => (
            <RegionalCard
              key={item.region.slug}
              item={item}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
