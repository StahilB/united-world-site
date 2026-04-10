import type { Core } from '@strapi/strapi';

import {
  buildIndexes,
  computeAutomaticSectionIds,
} from './article-sections-logic';

const SECTION_UID = 'api::section.section';
const ARTICLE_UID = 'api::article.article';
const REGION_UID = 'api::region.region';
const CATEGORY_UID = 'api::category.category';

const CACHE_TTL_MS = 5 * 60 * 1000;

type SectionRow = {
  id: number;
  documentId?: string;
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

async function loadSectionsCached(strapi: Core.Strapi): Promise<SectionRow[]> {
  const now = Date.now();
  if (sectionsCache && now - sectionsCacheLoadedAt < CACHE_TTL_MS) {
    return sectionsCache;
  }
  const rows = (await strapi.db.query(SECTION_UID).findMany({
    populate: { parent: true },
    limit: 10_000,
  })) as SectionRow[];
  sectionsCache = rows;
  sectionsCacheLoadedAt = now;
  return rows;
}

function extractFirstRelationTarget(ref: unknown): number | string | null {
  if (ref == null) return null;
  if (typeof ref === 'number' && Number.isFinite(ref)) return ref;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && ref !== null) {
    const o = ref as Record<string, unknown>;
    if (o.id != null && (typeof o.id === 'number' || typeof o.id === 'string')) {
      return o.id as number | string;
    }
    if (o.documentId != null && typeof o.documentId === 'string') {
      return o.documentId;
    }
    if (Array.isArray(o.connect) && o.connect.length) {
      return extractFirstRelationTarget(o.connect[0]);
    }
    if (Array.isArray(o.set) && o.set.length) {
      return extractFirstRelationTarget(o.set[0]);
    }
  }
  return null;
}

function extractManyRelationTargets(ref: unknown): Array<number | string> {
  if (ref == null) return [];
  if (Array.isArray(ref)) {
    const out: Array<number | string> = [];
    for (const item of ref) {
      const t = extractFirstRelationTarget(item);
      if (t != null) out.push(t);
    }
    return out;
  }
  if (typeof ref === 'object' && ref !== null) {
    const o = ref as Record<string, unknown>;
    if (Array.isArray(o.connect)) {
      return o.connect
        .map((x) => extractFirstRelationTarget(x))
        .filter((x): x is number | string => x != null);
    }
    if (Array.isArray(o.set)) {
      return o.set
        .map((x) => extractFirstRelationTarget(x))
        .filter((x): x is number | string => x != null);
    }
  }
  return [];
}

function extractManualSectionIds(
  raw: unknown,
  sectionByDocumentId?: Map<string, number>,
): number[] {
  const pushId = (item: unknown, out: number[]) => {
    if (typeof item === 'number' && Number.isFinite(item)) {
      out.push(item);
      return;
    }
    if (typeof item === 'object' && item && 'id' in item) {
      const id = Number((item as { id: unknown }).id);
      if (Number.isFinite(id)) out.push(id);
      return;
    }
    if (
      typeof item === 'object' &&
      item &&
      'documentId' in item &&
      sectionByDocumentId
    ) {
      const doc = String((item as { documentId: unknown }).documentId ?? '');
      const sid = sectionByDocumentId.get(doc);
      if (sid != null) out.push(sid);
    }
  };

  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: number[] = [];
    for (const item of raw) pushId(item, out);
    return out;
  }
  if (typeof raw === 'object' && raw !== null && 'connect' in raw) {
    const c = (raw as { connect?: unknown[] }).connect;
    if (Array.isArray(c)) {
      const out: number[] = [];
      for (const item of c) pushId(item, out);
      return out;
    }
  }
  if (typeof raw === 'object' && raw !== null && 'set' in raw) {
    const s = (raw as { set?: unknown[] }).set;
    if (Array.isArray(s)) {
      const out: number[] = [];
      for (const item of s) pushId(item, out);
      return out;
    }
  }
  return [];
}

async function resolveRegion(
  strapi: Core.Strapi,
  ref: unknown,
): Promise<{ id: number; name: string; slug: string } | null> {
  if (ref == null) return null;
  if (typeof ref === 'object' && ref && 'name' in ref && 'slug' in ref) {
    const o = ref as { id?: unknown; documentId?: unknown; name: unknown; slug: unknown };
    const id = o.id != null ? Number(o.id) : NaN;
    if (Number.isFinite(id)) {
      return {
        id,
        name: String(o.name ?? ''),
        slug: String(o.slug ?? ''),
      };
    }
    if (typeof o.documentId === 'string') {
      const row = await strapi.db.query(REGION_UID).findOne({
        where: { documentId: o.documentId },
      });
      if (!row) return null;
      return {
        id: row.id,
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
      };
    }
  }
  const target = extractFirstRelationTarget(ref);
  if (target == null) return null;

  if (typeof target === 'string') {
    const row = await strapi.db.query(REGION_UID).findOne({
      where: { documentId: target },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: String(row.name ?? ''),
      slug: String(row.slug ?? ''),
    };
  }

  const row = await strapi.db.query(REGION_UID).findOne({
    where: { id: target },
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
      'slug' in ref[0] &&
      'id' in ref[0]
    ) {
      return (ref as Array<{ id: unknown; name: unknown; slug: unknown }>).map(
        (r) => ({
          id: Number(r.id),
          name: String(r.name ?? ''),
          slug: String(r.slug ?? ''),
        }),
      );
    }
  }

  const targets = extractManyRelationTargets(ref);
  if (targets.length === 0) return [];

  const byId: number[] = [];
  const byDoc: string[] = [];
  for (const t of targets) {
    if (typeof t === 'number') byId.push(t);
    else byDoc.push(t);
  }

  const rows: Array<{ id: number; name: string; slug: string }> = [];

  if (byId.length) {
    const found = await strapi.db.query(CATEGORY_UID).findMany({
      where: { id: { $in: byId } },
    });
    for (const r of found as Array<{ id: number; name: string; slug: string }>) {
      rows.push({
        id: r.id,
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
      });
    }
  }
  if (byDoc.length) {
    const foundByDoc = await strapi.db.query(CATEGORY_UID).findMany({
      where: { documentId: { $in: byDoc } },
    });
    for (const r of foundByDoc as Array<{ id: number; name: string; slug: string }>) {
      rows.push({
        id: r.id,
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
      });
    }
  }

  return rows;
}

function buildSectionDocumentIdMap(sections: SectionRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sections) {
    if (s.documentId) m.set(s.documentId, s.id);
  }
  return m;
}

async function applySectionUnion(
  strapi: Core.Strapi,
  data: Record<string, unknown>,
  opts: { isUpdate: boolean; where?: Record<string, unknown> },
) {
  const sections = await loadSectionsCached(strapi);
  const sectionDocMap = buildSectionDocumentIdMap(sections);
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
      ? extractManualSectionIds(data.sections, sectionDocMap)
      : null;
  const manualFromExisting =
    existing?.sections != null
      ? extractManualSectionIds(existing.sections, sectionDocMap)
      : [];

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
