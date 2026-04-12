#!/usr/bin/env node
/**
 * Миграция количества просмотров статей из WordPress REST API в Strapi (views_count).
 *
 * Env: STRAPI_URL (default http://localhost:1337), STRAPI_TOKEN (обязателен)
 * Запуск из каталога strapi/: node scripts/migrate-views-from-wp.js
 */

const fs = require('fs');
const path = require('path');

const STRAPI_ROOT = path.join(__dirname, '..');

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

const WP_BASE = 'https://anounitedworld.com/wp-json/wp/v2/posts';

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яёü]/gi, '');
}

function normalizeTitle(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase();
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim();
}

function metaValue(meta, key) {
  if (!meta || typeof meta !== 'object') return undefined;
  const v = meta[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function pickPositiveInteger(v, depth = 0) {
  if (depth > 3) return null;
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return Math.floor(v);
  }
  if (typeof v === 'string') {
    const n = parseInt(String(v).replace(/\s/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
    return null;
  }
  if (typeof v === 'object' && v !== null) {
    for (const k of ['total', 'views', 'count', 'post_views']) {
      const x = pickPositiveInteger(v[k], depth + 1);
      if (x != null) return x;
    }
  }
  return null;
}

function getWpViewsFromMeta(post) {
  const meta = post.meta;
  if (!meta || typeof meta !== 'object') return null;
  const keys = ['views', 'post_views_count', '_jetpack_post_views', 'flavor_views'];
  for (const k of keys) {
    const n = pickPositiveInteger(metaValue(meta, k));
    if (n != null) return n;
  }
  return null;
}

async function fetchFlavorPostViews(postId) {
  const url = `https://anounitedworld.com/wp-json/flavor/v1/post-views/${postId}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data == null) return null;
    if (typeof data === 'number' && data > 0) return Math.floor(data);
    if (typeof data === 'object') {
      for (const k of ['views', 'count', 'total', 'post_views']) {
        const n = pickPositiveInteger(data[k]);
        if (n != null) return n;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getWpViewsForPost(post) {
  const fromMeta = getWpViewsFromMeta(post);
  if (fromMeta != null && fromMeta > 0) return fromMeta;
  return fetchFlavorPostViews(post.id);
}

async function fetchAllWpPosts() {
  const out = [];
  let page = 1;
  for (;;) {
    const q = new URLSearchParams();
    q.set('per_page', '100');
    q.set('page', String(page));
    q.set('_fields', 'id,slug,title,meta');
    let res;
    try {
      res = await fetch(`${WP_BASE}?${q}`, { redirect: 'follow' });
    } catch (e) {
      throw new Error(`WordPress API недоступен: ${e.message || e}`);
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`WordPress API ${res.status}: ${t}`);
    }
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;
    out.push(...posts);
    if (posts.length < 100) break;
    page += 1;
  }
  return out;
}

function unwrapArticleEntry(raw) {
  if (!raw) return null;
  if (raw.attributes && typeof raw.attributes === 'object') {
    return {
      id: raw.id,
      documentId: raw.documentId,
      ...raw.attributes,
    };
  }
  return { ...raw };
}

async function fetchAllStrapiArticles() {
  const out = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = new URLSearchParams();
    q.set('fields[0]', 'slug');
    q.set('fields[1]', 'views_count');
    q.set('fields[2]', 'title');
    q.set('pagination[pageSize]', '100');
    q.set('pagination[page]', String(page));
    let data;
    try {
      const res = await fetch(`${STRAPI}/api/articles?${q}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Strapi ${res.status}: ${t}`);
      }
      data = await res.json();
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        throw new Error(`Strapi API недоступен: ${e.message}`);
      }
      throw e;
    }
    for (const item of data.data || []) {
      out.push(unwrapArticleEntry(item));
    }
    pageCount = data.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);
  return out;
}

function buildStrapiIndexes(articles) {
  const byExactSlug = new Map();
  const bySlug = new Map();
  const byTitle = new Map();
  const byTitlePrefix = new Map();

  for (const a of articles) {
    const slug = String(a.slug || '');
    const title = String(a.title || '');
    const documentId = a.documentId;
    const views_count = Number(a.views_count);
    const vc = Number.isFinite(views_count) ? views_count : 0;

    const entry = {
      documentId,
      title,
      views_count: vc,
      slug,
    };

    if (slug) {
      byExactSlug.set(slug.toLowerCase(), entry);
    }
    const ns = normalizeSlug(slug);
    if (ns) bySlug.set(ns, entry);

    const nt = normalizeTitle(title);
    if (nt) {
      byTitle.set(nt, entry);
      const prefix = nt.slice(0, 40);
      if (prefix) byTitlePrefix.set(prefix, entry);
    }
  }

  return { byExactSlug, bySlug, byTitle, byTitlePrefix };
}

function findStrapiMatch(wpPost, indexes) {
  const { byExactSlug, bySlug, byTitle, byTitlePrefix } = indexes;
  const wpSlug = String(wpPost.slug || '');
  const rendered = wpPost.title?.rendered ?? '';

  const exact = byExactSlug.get(wpSlug.toLowerCase());
  if (exact) return { entry: exact, kind: 'slug' };

  const normSlug = normalizeSlug(wpSlug);
  if (normSlug) {
    const byNorm = bySlug.get(normSlug);
    if (byNorm) return { entry: byNorm, kind: 'slug' };
  }

  const nt = normalizeTitle(rendered);
  if (nt) {
    const byT = byTitle.get(nt);
    if (byT) return { entry: byT, kind: 'title' };

    const prefix = nt.slice(0, 40);
    if (prefix) {
      const byP = byTitlePrefix.get(prefix);
      if (byP) return { entry: byP, kind: 'prefix' };
    }
  }

  return null;
}

async function putViews(documentId, views_count) {
  const res = await fetch(`${STRAPI}/api/articles/${documentId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      data: { views_count },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PUT /api/articles/${documentId} ${res.status}: ${t}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  if (!TOKEN) {
    console.error('STRAPI_TOKEN обязателен.');
    process.exit(1);
  }

  let wpPosts;
  try {
    wpPosts = await fetchAllWpPosts();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  console.log('[WP] загружено постов: %d', wpPosts.length);

  let strapiArticles;
  try {
    strapiArticles = await fetchAllStrapiArticles();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  console.log('[Strapi] загружено статей: %d', strapiArticles.length);

  const indexes = buildStrapiIndexes(strapiArticles);

  let matched = 0;
  let updated = 0;
  let noMatch = 0;
  let noViews = 0;
  let putPending = false;

  for (const wp of wpPosts) {
    let wpViews;
    try {
      wpViews = await getWpViewsForPost(wp);
    } catch (e) {
      console.error('[WP] ошибка просмотров для id=%s: %s', wp.id, e.message || e);
      noViews += 1;
      continue;
    }

    if (wpViews == null || wpViews <= 0) {
      noViews += 1;
      continue;
    }

    const match = findStrapiMatch(wp, indexes);
    const wpTitlePlain = stripHtml(wp.title?.rendered || '');

    if (!match) {
      noMatch += 1;
      console.log(
        '✗ No match: %s (slug: %s)',
        wpTitlePlain || `(id ${wp.id})`,
        wp.slug || '',
      );
      continue;
    }

    matched += 1;
    const { entry, kind } = match;
    const logTitle = entry.title || wpTitlePlain;

    if (kind === 'slug') {
      console.log('✓ Matched by slug: %s — WP views: %d', logTitle, wpViews);
    } else if (kind === 'title') {
      console.log('✓ Matched by title: %s — WP views: %d', logTitle, wpViews);
    } else {
      console.log('✓ Matched by prefix: %s — WP views: %d', logTitle, wpViews);
    }

    const current = entry.views_count;
    if (current !== 0 && current >= wpViews) {
      continue;
    }

    if (!entry.documentId) {
      console.error(
        '[Strapi] нет documentId для статьи «%s», пропуск PUT',
        logTitle,
      );
      continue;
    }

    if (putPending) {
      await delay(100);
    }
    putPending = true;

    try {
      await putViews(entry.documentId, wpViews);
      updated += 1;
      entry.views_count = wpViews;
    } catch (e) {
      console.error('[PUT] %s', e.message || e);
    }
  }

  console.log(
    'Done. Matched: %d, Updated: %d, No match: %d, No views: %d',
    matched,
    updated,
    noMatch,
    noViews,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
