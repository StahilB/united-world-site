#!/usr/bin/env node
/**
 * Одноразовая (идемпотентная) пересборка sections у статей по тем же правилам, что и lifecycle article.
 *
 * Env: STRAPI_URL, STRAPI_TOKEN (обязателен)
 * Запуск из каталога strapi/: npm run reassign-sections
 */

const fs = require('fs');
const path = require('path');

const STRAPI_ROOT = path.join(__dirname, '..');

/**
 * Дублирует article-sections-logic.ts — при изменении правил обновите оба файла.
 */
const PARENT_PO_REGIONAM = 'По регионам';
const PARENT_PO_TEMAM = 'По темам';
const PARENT_GLOBAL_OBZORY = 'Глобальные обзоры';

function normalizeName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildIndexes(sections) {
  const bySlug = new Map();
  const regionNameToId = new Map();
  const themeNameToId = new Map();
  const globalRegionNameToId = new Map();

  const nPoReg = normalizeName(PARENT_PO_REGIONAM);
  const nPoTem = normalizeName(PARENT_PO_TEMAM);
  const nGlob = normalizeName(PARENT_GLOBAL_OBZORY);

  for (const s of sections) {
    if (s.slug) bySlug.set(s.slug, s.id);
    const pname = normalizeName(s.parent?.name ?? '');
    const sn = normalizeName(s.name);
    if (pname === nPoReg) regionNameToId.set(sn, s.id);
    if (pname === nPoTem) themeNameToId.set(sn, s.id);
    if (pname === nGlob) globalRegionNameToId.set(sn, s.id);
  }

  return { bySlug, regionNameToId, themeNameToId, globalRegionNameToId };
}

function resolveAvtorskieId(bySlug) {
  if (bySlug.has('avtorskie-kolonki')) return bySlug.get('avtorskie-kolonki');
  return bySlug.get('avtorskie-kolonki-ekspertiza');
}

function computeAutomaticSectionIds(opts) {
  const { bySlug, regionNameToId, themeNameToId, globalRegionNameToId } =
    opts.indexes;
  const ids = new Set();
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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(STRAPI_ROOT, '.env.local'));
loadEnvFile(path.join(STRAPI_ROOT, '.env'));

const STRAPI = (process.env.STRAPI_URL || 'http://localhost:1337').replace(
  /\/$/,
  '',
);
const TOKEN = process.env.STRAPI_TOKEN || '';

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function apiGet(urlPath) {
  const res = await fetch(`${STRAPI}${urlPath}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${urlPath} ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPut(urlPath, body) {
  const res = await fetch(`${STRAPI}${urlPath}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PUT ${urlPath} ${res.status}: ${t}`);
  }
  return res.json().catch(() => ({}));
}

function unwrapEntity(entry) {
  if (!entry) return null;
  if (entry.attributes && typeof entry.attributes === 'object') {
    return {
      id: entry.id,
      documentId: entry.documentId,
      ...entry.attributes,
    };
  }
  return entry;
}

/** Strapi 4: { data }; Strapi 5: плоский объект или data */
function unwrapData(rel) {
  if (rel == null) return null;
  if (rel.data !== undefined) {
    const d = rel.data;
    if (Array.isArray(d)) return d.map(unwrapEntity).filter(Boolean);
    return unwrapEntity(d);
  }
  if (Array.isArray(rel)) return rel.map(unwrapEntity).filter(Boolean);
  return unwrapEntity(rel);
}

function mapSectionRestToRow(s) {
  let parent = s.parent || null;
  if (parent && parent.data) {
    parent = unwrapEntity(parent.data);
  }
  parent = unwrapEntity(parent);
  return {
    id: s.id,
    documentId: s.documentId,
    name: s.name || '',
    slug: s.slug || '',
    parent: parent
      ? {
          id: parent.id,
          slug: parent.slug,
          name: parent.name,
        }
      : null,
  };
}

async function fetchAllSections() {
  const rows = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set('pagination[page]', String(page));
    q.set('pagination[pageSize]', '100');
    q.set('populate[0]', 'parent');
    const data = await apiGet(`/api/sections?${q}`);
    const list = data.data || [];
    for (const item of list) {
      const flat = item.attributes
        ? { id: item.id, documentId: item.documentId, ...item.attributes }
        : { ...item };
      rows.push(mapSectionRestToRow(flat));
    }
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return rows;
}

/** Strapi v4: { id, attributes }; Strapi 5: поля на верхнем уровне */
function normalizeArticleEntry(raw) {
  if (!raw) return raw;
  let base;
  if (raw.attributes && typeof raw.attributes === 'object') {
    base = { id: raw.id, documentId: raw.documentId, ...raw.attributes };
  } else {
    base = { ...raw };
  }
  base.region = unwrapData(base.region);
  const cats = unwrapData(base.categories);
  base.categories = Array.isArray(cats) ? cats : cats ? [cats] : [];
  const secs = unwrapData(base.sections);
  base.sections = Array.isArray(secs) ? secs : secs ? [secs] : [];
  return base;
}

async function fetchAllArticles() {
  const out = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set('pagination[page]', String(page));
    q.set('pagination[pageSize]', '50');
    q.set('populate[0]', 'region');
    q.set('populate[1]', 'categories');
    q.set('populate[2]', 'sections');
    const data = await apiGet(`/api/articles?${q}`);
    for (const item of data.data || []) {
      out.push(normalizeArticleEntry(item));
    }
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return out;
}

function sectionNameById(sectionRows, ids) {
  const byId = new Map(sectionRows.map((s) => [s.id, s.name]));
  return ids.map((id) => byId.get(id) || `#${id}`);
}

function sameSortedIds(a, b) {
  const x = [...new Set(a)].sort((m, n) => m - n);
  const y = [...new Set(b)].sort((m, n) => m - n);
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

async function main() {
  if (!TOKEN) {
    console.error('STRAPI_TOKEN обязателен.');
    process.exit(1);
  }

  console.log('[reassign-sections] STRAPI_URL=%s', STRAPI);

  const sectionRows = await fetchAllSections();
  console.log(
    '[reassign-sections] загружено sections: %d',
    sectionRows.length,
  );

  const indexes = buildIndexes(sectionRows);

  const articles = await fetchAllArticles();
  console.log('[reassign-sections] статей: %d', articles.length);

  let updated = 0;
  let unchanged = 0;

  for (const article of articles) {
    const region = article.region
      ? {
          name: String(article.region.name ?? ''),
          slug: String(article.region.slug ?? ''),
        }
      : null;

    const categories = (article.categories || []).map((c) => ({
      name: String(c.name ?? ''),
      slug: String(c.slug ?? ''),
    }));

    const automatic = computeAutomaticSectionIds({
      format: article.format ?? null,
      is_global_review: article.is_global_review ?? false,
      region,
      categories,
      indexes,
    });

    const existingIds = (article.sections || []).map((s) => s.id);
    const merged = [...new Set([...existingIds, ...automatic])];

    const docId = article.documentId;
    if (!docId) {
      throw new Error(
        `Article id=${article.id} has no documentId; Strapi 5 REST requires documentId.`,
      );
    }

    if (sameSortedIds(existingIds, merged)) {
      unchanged += 1;
      const names = sectionNameById(sectionRows, merged);
      console.log(
        'Статья [%s] → sections: [%s]',
        article.title || article.slug,
        names.join(', '),
      );
      continue;
    }

    await apiPut(`/api/articles/${docId}`, {
      data: {
        sections: merged,
      },
    });
    updated += 1;

    const names = sectionNameById(sectionRows, merged);
    console.log(
      'Статья [%s] → sections: [%s]',
      article.title || article.slug,
      names.join(', '),
    );
  }

  console.log(
    '[reassign-sections] готово: обновлено %d, без изменений %d',
    updated,
    unchanged,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
