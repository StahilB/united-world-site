/**
 * Ссылки для пунктов дерева Section (исключения: EN, авторские колонки).
 */

/** Slug'и разделов «Авторские колонки» в Strapi → страница экспертизы, не /section/... */
export const SECTION_SLUGS_REDIRECT_TO_COLUMNS = new Set([
  "avtorskie-kolonki",
  "avtorskie-kolonki-ekspertiza",
]);

/** Подразделы «О центре» в Strapi → отдельные Next-маршруты (контент из single type static-page). */
const SECTION_SLUG_TO_STATIC_PAGE: Record<string, string> = {
  "ob-organizatsii": "/about",
  komanda: "/team",
  sotrudnichestvo: "/cooperation",
  kontakty: "/contacts",
  novosti: "/news",
};

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
  return `/section/${slug}`;
}
