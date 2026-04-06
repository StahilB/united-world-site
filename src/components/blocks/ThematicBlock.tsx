import Image from "next/image";
import Link from "next/link";
import type { ThematicBlockItem } from "@/lib/types";

export type ThematicBlockProps = {
  items: ThematicBlockItem[];
};

function ThematicCard({ item }: { item: ThematicBlockItem }) {
  const articleHref = `/articles/${item.article.slug}`;
  const categoryHref = `/category/${item.category.slug}`;

  return (
    <article className="border-b border-[#E5E5E5] pb-6">
      <Link href={articleHref} className="group block">
        <div className="relative mx-auto aspect-[3/2] w-full max-w-[220px] overflow-hidden bg-surface lg:max-w-none">
          <Image
            src={item.article.coverImage}
            alt={item.article.title}
            fill
            className="object-cover transition-opacity duration-200 group-hover:opacity-90"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </Link>

      <div className="mx-auto mt-3 w-full max-w-[220px] space-y-2 lg:max-w-none">
        <Link
          href={categoryHref}
          className="block font-sans text-[11px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
          style={{ color: item.category.color }}
        >
          {item.category.name}
        </Link>
        <Link href={articleHref} className="group block">
          <h3 className="font-heading text-[17px] font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent">
            {item.article.title}
          </h3>
        </Link>
        <p className="font-sans text-[11px] text-muted">{item.article.format}</p>
      </div>
    </article>
  );
}

export function ThematicBlock({ items }: ThematicBlockProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="border-l-4 border-accent pl-4 font-heading text-lg font-normal uppercase tracking-[0.14em] text-primary md:text-xl">
          Тематика
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ThematicCard key={item.category.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
