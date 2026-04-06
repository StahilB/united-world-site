import Link from "next/link";
import type { Category, Region } from "@/lib/types";

type MegaMenuProps = {
  regions: Region[];
  categories: Category[];
};

const linkClass =
  "text-sm font-normal text-secondary transition-colors hover:text-primary hover:underline";

export function MegaMenu({ regions, categories }: MegaMenuProps) {
  const mid = Math.ceil(regions.length / 2);
  const colA = regions.slice(0, mid);
  const colB = regions.slice(mid);

  return (
    <div className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-2">
        <div>
          <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            ПО РЕГИОНАМ
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <ul className="space-y-2">
              {colA.map((r) => (
                <li key={r.id}>
                  <Link href={`/region/${r.slug}`} className={linkClass}>
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {colB.map((r) => (
                <li key={r.id}>
                  <Link href={`/region/${r.slug}`} className={linkClass}>
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            ПО ТЕМАМ
          </p>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2 px-6 py-4">
          <Link
            href="/analytics/situational"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
          >
            Ситуативный анализ
          </Link>
          <Link
            href="/analytics/global"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
          >
            Глобальные обзоры
          </Link>
        </div>
      </div>
      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2 px-6 py-4">
          <Link
            href="/expertise/opinions"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
          >
            Мнения
          </Link>
          <Link
            href="/expertise/interviews"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
          >
            Интервью
          </Link>
          <Link
            href="/expertise/columns"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-primary hover:underline"
          >
            Авторские колонки
          </Link>
        </div>
      </div>
    </div>
  );
}
