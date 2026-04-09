import type { Core } from '@strapi/strapi';

const SECTION_UID = 'api::section.section';
const ARTICLE_UID = 'api::article.article';
const REGION_UID = 'api::region.region';
const CATEGORY_UID = 'api::category.category';

const CACHE_TTL_MS = 5 * 60 * 1000;

/** Тематическая категория (slug) → Section «По темам» (slug) — как в fix-article-categories.js */
const CATEGORY_SLUG_TO_SECTION_SLUG: Record<string, string> = {
  'mezhdunarodnaya-bezopasnost': 'mezhdunarodnaya-bezopasnost-po-temam',
  'politika-i-diplomatiya': 'politika-i-diplomatiya-po-temam',
  'ekonomika-i-razvitie': 'ekonomika-i-razvitie-po-temam',
  'energetika-i-resursy': 'energiya-i-resursy-po-temam',
  'ekologiya-i-klimat': 'ekologiya-i-klimat-po-temam',
  'obrazovanie-i-kultura': 'obrazovanie-nauka-i-kultura-po-temam',
  'mezhdunarodnye-organizatsii': 'mezhdunarodnye-organizatsii-po-temam',
  'mezhdunarodnye-meropriyatiya': 'mezhdunarodnye-meropriyatiya-po-temam',
};

/** slug региона → базовый сегмент для Section «…-globalnye-obzory» (как в seed-sections) */
const REGION_SLUG_TO_BASE: Record<string, string> = {
  rossiya: 'rossiya',
  evropa: 'evropa',
  afrika: 'afrika',
  kavkaz: 'kavkaz',
  arktika: 'arktika',
  'latinskaya-amerika': 'latinskaya-amerika',
  'tsentralnaya-aziya': 'tsentralnaya-aziya',
  'yuzhnaya-aziya': 'yuzhnaya-aziya',
  'yugo-vostochnaya-aziya': 'yugo-vostochnaya-aziya',
  'severnaya-amerika': 'severnaya-amerika',
  'blizhniy-vostok': 'blizhniy-vostok',
  'blizhnij-vostok': 'blizhniy-vostok',
  'vostochnaya-aziya-i-atp': 'vostochnaya-aziya-i-atp',
  'vostochnaya-aziya-i-atr': 'vostochnaya-aziya-i-atp',
  'avstraliya-i-okeaniya': 'avstraliya-i-okeaniya',
};

type SectionRow = {
  id: number;
  name: string;
  slug: string;
  parent?: { id: number; slug?: string; name?: string } | null;
};

let sectionsCache: SectionRow[] | null = null;
let sectionsCacheLoadedAt = 0;

function getStrapi(): Core.Strapi {
  const g = global as unknown as { strapi?: Core.Strapi };
  if (!g.strapi) {
    throw new Error('[article lifecycles] global.strapi is not available');
  }
  return g.strapi;
}

function normalizeName(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function loadSectionsCached(strapi: Core.Strapi): Promise<SectionRow[]> {
  const now = Date.now();
  if (sectionsCache && now - sectionsCacheLoadedAt < CACHE_TTL_MS) {
    return sectionsCache;
  }
  const rows = (await strapi.db.query(SECTION_UID).findMany({
    populate: { parent: true },
    limit: 500,
  })) as SectionRow[];
  sectionsCache = rows;
  sectionsCacheLoadedAt = now;
  return rows;
}

function buildIndexes(sections: SectionRow[]) {
  const bySlug = new Map<string, number>();
  const poRegionamParentSlug = 'po-regionam';
  const poTemamParentSlug = 'po-temam';

  const regionNameToId = new Map<string, number>();
  const themeNameToId = new Map<string, number>();

  for (const s of sections) {
    if (s.slug) {
      bySlug.set(s.slug, s.id);
    }
    const pslug = s.parent?.slug;
    if (pslug === poRegionamParentSlug) {
      regionNameToId.set(normalizeName(s.name), s.id);
    }
    if (pslug === poTemamParentSlug) {
      themeNameToId.set(normalizeName(s.name), s.id);
    }
  }

  return { bySlug, regionNameToId, themeNameToId };
}

function resolveAvtorskieId(bySlug: Map<string, number>): number | undefined {
  if (bySlug.has('avtorskie-kolonki')) return bySlug.get('avtorskie-kolonki');
  return bySlug.get('avtorskie-kolonki-ekspertiza');
}

function extractManualSectionIds(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: number[] = [];
    for (const item of raw) {
      if (typeof item === 'number' && Number.isFinite(item)) {
        out.push(item);
      } else if (typeof item === 'object' && item && 'id' in item) {
        const id = Number((item as { id: unknown }).id);
        if (Number.isFinite(id)) out.push(id);
      }
    }
    return out;
  }
  if (typeof raw === 'object' && raw !== null && 'connect' in raw) {
    const c = (raw as { connect?: unknown[] }).connect;
    if (Array.isArray(c)) {
      return c
        .map((x) => {
          if (typeof x === 'object' && x && 'id' in x) {
            return Number((x as { id: unknown }).id);
          }
          return NaN;
        })
        .filter((n) => Number.isFinite(n));
    }
  }
  return [];
}

async function resolveRegion(
  strapi: Core.Strapi,
  ref: unknown,
): Promise<{ id: number; name: string; slug: string } | null> {
  if (ref == null) return null;
  if (typeof ref === 'object' && ref && 'id' in ref && 'name' in ref && 'slug' in ref) {
    const o = ref as { id: unknown; name: unknown; slug: unknown };
    return {
      id: Number(o.id),
      name: String(o.name ?? ''),
      slug: String(o.slug ?? ''),
    };
  }
  let id: number | undefined;
  if (typeof ref === 'number') id = ref;
  else if (typeof ref === 'object' && ref && 'id' in ref) {
    id = Number((ref as { id: unknown }).id);
  }
  if (id == null || !Number.isFinite(id)) return null;
  const row = await strapi.db.query(REGION_UID).findOne({
    where: { id },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
  };
}

async function resolveCategories(
  strapi: Core.Strapi,
  ref: unknown,
): Promise<Array<{ id: number; name: string; slug: string }>> {
  if (ref == null) return [];
  if (Array.isArray(ref)) {
    if (
      ref.length > 0 &&
      typeof ref[0] === 'object' &&
      ref[0] &&
      'name' in ref[0] &&
      'slug' in ref[0]
    ) {
      return (ref as Array<{ id: unknown; name: unknown; slug: unknown }>).map((r) => ({
        id: Number(r.id),
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
      }));
    }
    const ids: number[] = [];
    for (const item of ref) {
      if (typeof item === 'number') ids.push(item);
      else if (typeof item === 'object' && item && 'id' in item) {
        const id = Number((item as { id: unknown }).id);
        if (Number.isFinite(id)) ids.push(id);
      }
    }
    if (ids.length === 0) return [];
    const rows = await strapi.db.query(CATEGORY_UID).findMany({
      where: { id: { $in: ids } },
    });
    return (rows as Array<{ id: number; name: string; slug: string }>).map((r) => ({
      id: r.id,
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
    }));
  }
  return [];
}

function computeAutomaticSectionIds(opts: {
  format?: string | null;
  is_global_review?: boolean | null;
  region: { name: string; slug: string } | null;
  categories: Array<{ name: string; slug: string }>;
  indexes: ReturnType<typeof buildIndexes>;
}): number[] {
  const { bySlug, regionNameToId, themeNameToId } = opts.indexes;
  const ids = new Set<number>();
  const fmt = opts.format;

  const ekspertiza = bySlug.get('ekspertiza');
  const analitika = bySlug.get('analitika');
  const avtorskie = resolveAvtorskieId(bySlug);
  const mneniya = bySlug.get('mneniya-ekspertiza');
  const intervyu = bySlug.get('intervyu-ekspertiza');

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
      regionNameToId.get(normalizeName(r.slug.replace(/-/g, ' ')));
    if (poRegionId != null) ids.add(poRegionId);
  }

  for (const cat of opts.categories) {
    const mappedSlug = CATEGORY_SLUG_TO_SECTION_SLUG[cat.slug];
    if (mappedSlug && bySlug.has(mappedSlug)) {
      ids.add(bySlug.get(mappedSlug)!);
      continue;
    }
    const tn = normalizeName(cat.name);
    const tid = themeNameToId.get(tn);
    if (tid != null) ids.add(tid);
  }

  if (opts.is_global_review === true && r) {
    const globalRoot = bySlug.get('globalnye-obzory');
    if (globalRoot != null) ids.add(globalRoot);
    const base = REGION_SLUG_TO_BASE[r.slug] ?? r.slug;
    const childSlug = `${base}-globalnye-obzory`;
    const childId = bySlug.get(childSlug);
    if (childId != null) ids.add(childId);
  }

  return [...ids].filter((n) => Number.isFinite(n));
}

async function applySectionUnion(
  strapi: Core.Strapi,
  data: Record<string, unknown>,
  opts: { isUpdate: boolean; where?: Record<string, unknown> },
) {
  const sections = await loadSectionsCached(strapi);
  const indexes = buildIndexes(sections);

  let existing: {
    format?: string;
    is_global_review?: boolean;
    region?: unknown;
    categories?: unknown;
    sections?: unknown;
  } | null = null;

  if (opts.isUpdate && opts.where && Object.keys(opts.where).length > 0) {
    existing = (await strapi.db.query(ARTICLE_UID).findOne({
      where: opts.where as Record<string, unknown>,
      populate: { region: true, categories: true, sections: true },
    })) as typeof existing;
  }

  const format =
    (data.format as string | undefined) !== undefined
      ? (data.format as string)
      : existing?.format;
  const is_global_review =
    data.is_global_review !== undefined
      ? Boolean(data.is_global_review)
      : Boolean(existing?.is_global_review);

  const regionRef =
    data.region !== undefined ? data.region : existing?.region;
  const categoriesRef =
    data.categories !== undefined ? data.categories : existing?.categories;

  const region = await resolveRegion(strapi, regionRef);
  const categories = await resolveCategories(strapi, categoriesRef);

  const manualFromPayload =
    data.sections !== undefined
      ? extractManualSectionIds(data.sections)
      : null;
  const manualFromExisting =
    existing?.sections != null ? extractManualSectionIds(existing.sections) : [];

  const manual =
    manualFromPayload !== null ? manualFromPayload : manualFromExisting;

  const automatic = computeAutomaticSectionIds({
    format: format ?? null,
    is_global_review,
    region,
    categories,
    indexes,
  });

  const merged = [...new Set([...manual, ...automatic])];
  data.sections = merged;
}

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const strapi = getStrapi();
    await applySectionUnion(strapi, event.params.data, { isUpdate: false });
  },

  async beforeUpdate(event: {
    params: { data: Record<string, unknown>; where: Record<string, unknown> };
  }) {
    const strapi = getStrapi();
    await applySectionUnion(strapi, event.params.data, {
      isUpdate: true,
      where: event.params.where,
    });
  },
};
