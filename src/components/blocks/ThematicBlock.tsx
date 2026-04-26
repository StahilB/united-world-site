import Image from "next/image";
import Link from "next/link";
import type { ThematicBlockItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { localizeHref } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

export type ThematicBlockProps = {
  items: ThematicBlockItem[];
  locale?: Locale;
};

function ThematicCard({ item, locale }: { item: ThematicBlockItem; locale: Locale }) {
  const articleHref = localizeHref(`/articles/${item.article.slug}`, locale);
  const categoryHref = localizeHref(`/category/${item.category.slug}`, locale);

  return (
    <article className="min-w-0">
      <Link href={articleHref} className="group block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-warm">
          <Image
            src={item.article.coverImage}
            alt={item.article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </Link>
      <Link
        href={categoryHref}
        className="kicker mt-4 block transition-colors hover:text-ink"
      >
        {item.category.name}
      </Link>
      <Link href={articleHref} className="group mt-2 block">
        <h3 className="font-heading text-[18px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold-deep">
          {item.article.title}
        </h3>
      </Link>
    </article>
  );
}

export function ThematicBlock({ items, locale = "ru" }: ThematicBlockProps) {
  const dict = getDictionary(locale);
  if (items.length === 0) return null;

  return (
    <section className="bg-paper section-home">
      <div className="container-site">
        <Link
          href={localizeHref("/section/po-temam", locale)}
          className="inline-block group"
        >
          <h2 className="h-section transition-colors group-hover:text-gold-deep">
            {dict.home.thematicKicker}
          </h2>
        </Link>
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ThematicCard key={item.category.slug} item={item} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
