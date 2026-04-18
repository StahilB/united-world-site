"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type SectionRubricFiltersProps = {
  sectionSlug: string;
  /** Подпись сайдбара: тема или регион */
  label: string;
  items: { slug: string; name: string }[];
  selectedFilter?: string;
};

export function SectionRubricFilters({
  sectionSlug,
  label,
  items,
  selectedFilter,
}: SectionRubricFiltersProps) {
  const router = useRouter();
  const base = `/section/${sectionSlug}`;

  return (
    <>
      <div className="mb-6 lg:mb-0 lg:hidden">
        <label
          htmlFor="rubric-filter-mobile"
          className="mb-1 block font-sans text-xs font-semibold uppercase tracking-wide text-muted"
        >
          {label}
        </label>
        <select
          id="rubric-filter-mobile"
          className="w-full min-h-11 border border-neutral-200 bg-white px-3 py-2 font-sans text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
          value={selectedFilter ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v ? `${base}?filter=${encodeURIComponent(v)}` : base);
          }}
        >
          <option value="">Все</option>
          {items.map((it) => (
            <option key={it.slug} value={it.slug}>
              {it.name}
            </option>
          ))}
        </select>
      </div>

      <aside
        className="hidden w-[220px] shrink-0 lg:block"
        aria-label={`Фильтр: ${label}`}
      >
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <ul className="mt-3 space-y-0.5 border-t border-neutral-200 pt-3">
          <li>
            <Link
              href={base}
              className={`block rounded px-2 py-1.5 font-sans text-sm transition-colors ${
                !selectedFilter
                  ? "bg-ink/8 font-semibold text-ink"
                  : "text-secondary hover:bg-surface hover:text-ink"
              }`}
            >
              Все
            </Link>
          </li>
          {items.map((it) => (
            <li key={it.slug}>
              <Link
                href={`${base}?filter=${encodeURIComponent(it.slug)}`}
                className={`block rounded px-2 py-1.5 font-sans text-sm transition-colors ${
                  selectedFilter === it.slug
                    ? "bg-ink/8 font-semibold text-ink"
                    : "text-secondary hover:bg-surface hover:text-ink"
                }`}
              >
                {it.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
