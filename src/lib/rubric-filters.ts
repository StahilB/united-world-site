import type { Section } from "./api";

/** «По регионам» (ветка аналитики) — в сайдбаре фильтруем по темам (подрубрики «По темам»). */
export const SECTION_SLUG_PO_REGIONAM = "po-regionam";
/** «По темам» — в сайдбаре фильтруем по регионам (подрубрики «По регионам»). */
export const SECTION_SLUG_PO_TEMAM = "po-temam";

export type RubricSidebarMode = "filter-by-theme" | "filter-by-region";

/**
 * Определяет, нужен ли сайдбар с пересечением рубрик:
 * - в цепочке есть «По регионам» → список тем (дети `po-temam`);
 * - в цепочке есть «По темам» → список регионов (дети `po-regionam`).
 */
export function getRubricSidebarMode(path: Section[]): RubricSidebarMode | null {
  const slugs = path.map((p) => p.slug);
  if (slugs.includes(SECTION_SLUG_PO_REGIONAM)) return "filter-by-theme";
  if (slugs.includes(SECTION_SLUG_PO_TEMAM)) return "filter-by-region";
  return null;
}

export function findSectionNodeBySlug(tree: Section[], slug: string): Section | null {
  for (const n of tree) {
    if (n.slug === slug) return n;
    const d = findSectionNodeBySlug(n.children, slug);
    if (d) return d;
  }
  return null;
}

/** Пункты противоположной ветки для чекбоксов/ссылок. */
export function getRubricFilterItems(
  tree: Section[],
  mode: RubricSidebarMode,
): { slug: string; name: string }[] {
  const parentSlug =
    mode === "filter-by-theme" ? SECTION_SLUG_PO_TEMAM : SECTION_SLUG_PO_REGIONAM;
  const node = findSectionNodeBySlug(tree, parentSlug);
  if (!node?.children?.length) return [];
  return node.children.map((c) => ({ slug: c.slug, name: c.name }));
}

export function isValidFilterSlug(
  filter: string | undefined,
  items: { slug: string }[],
): boolean {
  if (!filter?.trim()) return false;
  return items.some((i) => i.slug === filter);
}
