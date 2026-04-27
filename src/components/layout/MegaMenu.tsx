import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { localizeHref } from "@/lib/i18n/types";

const linkClass =
  "text-sm font-normal text-ink-soft transition-colors hover:text-ink hover:underline";

export type MegaMenuItem = {
  /** Текст в текущей локали (готовый, уже выбранный от name/name_en) */
  label: string;
  /** Базовый путь без префикса локали, напр. /region/rossiya */
  href: string;
};

type Props = {
  locale?: Locale;
  /** Пункты для колонки Macroregions (регионы) */
  regions?: MegaMenuItem[];
  /** Пункты для колонки Subjects (категории) */
  categories?: MegaMenuItem[];
  /** Пункты для колонки Global Reviews (регионы для обзоров) */
  globalReviews?: MegaMenuItem[];
};

export function MegaMenu({
  locale = "ru",
  regions = [],
  categories = [],
  globalReviews = [],
}: Props) {
  const dict = getDictionary(locale);

  // Делим список регионов на 2 колонки если он длинный (как было раньше)
  const mid = Math.ceil(regions.length / 2);
  const regionsColA = regions.slice(0, mid);
  const regionsColB = regions.slice(mid);

  return (
    <div className="bg-white border-t border-rule shadow-md">
      <div className="container-site grid gap-8 py-6 md:grid-cols-3">
        <div>
          <p className="kicker mb-3">
            {locale === "en" ? "Macroregions" : "По регионам"}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <ul className="space-y-2">
              {regionsColA.map((r) => (
                <li key={r.href}>
                  <Link href={localizeHref(r.href, locale)} className={linkClass}>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {regionsColB.map((r) => (
                <li key={r.href}>
                  <Link href={localizeHref(r.href, locale)} className={linkClass}>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="kicker mb-3">
            {locale === "en" ? "Subjects" : "По темам"}
          </p>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.href}>
                <Link href={localizeHref(c.href, locale)} className={linkClass}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="kicker mb-3">
            {locale === "en" ? "Global Reviews" : "Глобальные обзоры"}
          </p>
          <ul className="space-y-2">
            {globalReviews.map((r) => (
              <li key={r.href}>
                <Link href={localizeHref(r.href, locale)} className={linkClass}>
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
