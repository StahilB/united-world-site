/**
 * Ссылки для пунктов дерева Section.
 *
 * Часть подразделов в БД хранится с суффиксами (-po-temam,
 * -po-regionam, -globalnye-obzory) и пересекается со slug'ами
 * других коллекций (Category, Region). Для этих случаев ведём
 * на соответствующие "родные" маршруты, чтобы не было 404.
 */

/** Slug'и разделов «Авторские колонки» в Strapi → страница экспертизы. */
export const SECTION_SLUGS_REDIRECT_TO_COLUMNS = new Set([
  "avtorskie-kolonki",
  "avtorskie-kolonki-ekspertiza",
]);

/** Подразделы «О центре» в Strapi → отдельные Next-маршруты. */
const SECTION_SLUG_TO_STATIC_PAGE: Record<string, string> = {
  "ob-organizatsii": "/about",
  komanda: "/team",
  sotrudnichestvo: "/cooperation",
  kontakty: "/contacts",
  novosti: "/news",
};

/** Темы (По темам) — slug категорий совпадает с slug'ом подсекции
 *  без суффикса -po-temam. Также бывают «голые» slug-и (без суффикса). */
const THEME_BARE_SLUGS = new Set([
  "mezhdunarodnaya-bezopasnost",
  "politika-i-diplomatiya",
  "ekonomika-i-razvitie",
  "energetika-i-resursy",
  "energiya-i-resursy",
  "ekologiya-i-klimat",
  "obrazovanie-i-kultura",
  "obrazovanie-nauka-i-kultura",
  "mezhdunarodnye-organizatsii",
  "mezhdunarodnye-meropriyatiya",
]);

/** Регионы — slug совпадает со slug-ом подсекции без -po-regionam. */
const REGION_BARE_SLUGS = new Set([
  "rossiya",
  "evropa",
  "blizhniy-vostok",
  "afrika",
  "latinskaya-amerika",
  "kavkaz",
  "tsentralnaya-aziya",
  "yuzhnaya-aziya",
  "yugo-vostochnaya-aziya",
  "vostochnaya-aziya-i-atr",
  "severnaya-amerika",
  "avstraliya-i-okeaniya",
  "arktika",
]);

export function getSectionHref(slug: string): string {
  if (SECTION_SLUGS_REDIRECT_TO_COLUMNS.has(slug)) {
    return "/expertise/columns";
  }
  if (slug === "en") {
    return "#";
  }
  const staticHref = SECTION_SLUG_TO_STATIC_PAGE[slug];
  if (staticHref) {
    return staticHref;
  }

  // Подсекции "По темам" → /category/<base>
  if (slug.endsWith("-po-temam")) {
    const base = slug.replace(/-po-temam$/, "");
    return `/category/${base}`;
  }
  // "Голые" slug-и тем (без суффикса) → /category/<slug>
  if (THEME_BARE_SLUGS.has(slug)) {
    return `/category/${slug}`;
  }

  // Подсекции "По регионам" → /region/<base>
  if (slug.endsWith("-po-regionam")) {
    const base = slug.replace(/-po-regionam$/, "");
    return `/region/${base}`;
  }
  // "Голые" slug-и регионов → /region/<slug>
  if (REGION_BARE_SLUGS.has(slug)) {
    return `/region/${slug}`;
  }

  // Подсекции "Глобальные обзоры" → /section/globalnye-obzory?region=<base>
  if (slug.endsWith("-globalnye-obzory")) {
    const base = slug.replace(/-globalnye-obzory$/, "");
    return `/section/globalnye-obzory?region=${base}`;
  }

  return `/section/${slug}`;
}
