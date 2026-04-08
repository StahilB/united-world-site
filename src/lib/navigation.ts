/**
 * Ссылки для пунктов дерева Section (исключения: EN, авторские колонки).
 */

/** Slug'и разделов «Авторские колонки» в Strapi → страница экспертизы, не /section/... */
export const SECTION_SLUGS_REDIRECT_TO_COLUMNS = new Set([
  "avtorskie-kolonki",
  "avtorskie-kolonki-ekspertiza",
]);

export function getSectionHref(slug: string): string {
  if (SECTION_SLUGS_REDIRECT_TO_COLUMNS.has(slug)) {
    return "/expertise/columns";
  }
  if (slug === "en") {
    return "#";
  }
  return `/section/${slug}`;
}
