/**
 * Общая логика автопривязки Section к статье (lifecycle + scripts/reassign-sections).
 * Индексация дочерних рубрик — по parent.name: «По регионам», «По темам», «Глобальные обзоры».
 */

const PARENT_PO_REGIONAM = 'По регионам';
const PARENT_PO_TEMAM = 'По темам';
const PARENT_GLOBAL_OBZORY = 'Глобальные обзоры';

export function normalizeName(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export type SectionInput = {
  id: number;
  name: string;
  slug?: string;
  parent?: { name?: string; slug?: string } | null;
};

export type SectionIndexes = {
  bySlug: Map<string, number>;
  regionNameToId: Map<string, number>;
  themeNameToId: Map<string, number>;
  globalRegionNameToId: Map<string, number>;
};

export function buildIndexes(sections: SectionInput[]): SectionIndexes {
  const bySlug = new Map<string, number>();
  const regionNameToId = new Map<string, number>();
  const themeNameToId = new Map<string, number>();
  const globalRegionNameToId = new Map<string, number>();

  const nPoReg = normalizeName(PARENT_PO_REGIONAM);
  const nPoTem = normalizeName(PARENT_PO_TEMAM);
  const nGlob = normalizeName(PARENT_GLOBAL_OBZORY);

  for (const s of sections) {
    if (s.slug) {
      bySlug.set(s.slug, s.id);
    }
    const pname = normalizeName(s.parent?.name ?? '');
    const sn = normalizeName(s.name);
    if (pname === nPoReg) {
      regionNameToId.set(sn, s.id);
    }
    if (pname === nPoTem) {
      themeNameToId.set(sn, s.id);
    }
    if (pname === nGlob) {
      globalRegionNameToId.set(sn, s.id);
    }
  }

  return { bySlug, regionNameToId, themeNameToId, globalRegionNameToId };
}

function resolveAvtorskieId(bySlug: Map<string, number>): number | undefined {
  if (bySlug.has('avtorskie-kolonki')) return bySlug.get('avtorskie-kolonki');
  return bySlug.get('avtorskie-kolonki-ekspertiza');
}

export function computeAutomaticSectionIds(opts: {
  format?: string | null;
  is_global_review?: boolean | null;
  region: { name: string; slug: string } | null;
  categories: Array<{ name: string; slug: string }>;
  indexes: SectionIndexes;
}): number[] {
  const { bySlug, regionNameToId, themeNameToId, globalRegionNameToId } =
    opts.indexes;
  const ids = new Set<number>();
  const fmt = opts.format;

  const ekspertiza = bySlug.get('ekspertiza');
  const analitika = bySlug.get('analitika');
  const avtorskie = resolveAvtorskieId(bySlug);
  const mneniya = bySlug.get('mneniya-ekspertiza');
  const intervyu = bySlug.get('intervyu-ekspertiza');
  const globalRoot = bySlug.get('globalnye-obzory');

  if (fmt === 'колонка') {
    if (avtorskie != null) ids.add(avtorskie);
    if (ekspertiza != null) ids.add(ekspertiza);
  } else if (fmt === 'мнение') {
    if (mneniya != null) ids.add(mneniya);
    if (ekspertiza != null) ids.add(ekspertiza);
  } else if (fmt === 'интервью') {
    if (intervyu != null) ids.add(intervyu);
    if (ekspertiza != null) ids.add(ekspertiza);
  } else if (fmt === 'анализ' || fmt === 'обзор') {
    if (analitika != null) ids.add(analitika);
  }

  const r = opts.region;
  if (r) {
    const rn = normalizeName(r.name);
    const poRegionId =
      regionNameToId.get(rn) ??
      regionNameToId.get(normalizeName(String(r.slug || '').replace(/-/g, ' ')));
    if (poRegionId != null) ids.add(poRegionId);
  }

  for (const cat of opts.categories) {
    const tn = normalizeName(cat.name);
    const tid = themeNameToId.get(tn);
    if (tid != null) ids.add(tid);
  }

  if (opts.is_global_review === true && r) {
    if (globalRoot != null) ids.add(globalRoot);
    const gr = normalizeName(r.name);
    const childId = globalRegionNameToId.get(gr);
    if (childId != null) ids.add(childId);
  }

  return [...ids].filter((n) => Number.isFinite(n));
}
