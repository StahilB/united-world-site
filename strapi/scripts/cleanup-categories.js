'use strict';

/**
 * Normalizes Category collection: canonical rows, removes hex-slug junk and duplicates.
 * Never deletes or updates "Авторские колонки" (by exact name).
 *
 * Run from the strapi directory (with DB reachable per .env): npm run cleanup-categories
 *
 * Uses compileStrapi() so TypeScript config (config/*.ts) is applied, same as `strapi console`.
 * Category has draftAndPublish: false — there is no publishedAt to set.
 */

const { compileStrapi, createStrapi } = require('@strapi/core');

const UID = 'api::category.category';

const PROTECTED_NAME = 'Авторские колонки';

const CANONICAL = [
  { name: 'Международная безопасность', slug: 'mezhdunarodnaya-bezopasnost' },
  { name: 'Политика и дипломатия', slug: 'politika-i-diplomatiya' },
  { name: 'Экономика и развитие', slug: 'ekonomika-i-razvitie' },
  { name: 'Энергетика и ресурсы', slug: 'energetika-i-resursy' },
  { name: 'Экология и климат', slug: 'ekologiya-i-klimat' },
  { name: 'Образование и культура', slug: 'obrazovanie-i-kultura' },
  { name: 'Международные организации', slug: 'mezhdunarodnye-organizatsii' },
  { name: 'Международные мероприятия', slug: 'mezhdunarodnye-meropriyatiya' },
  { name: 'Мнения', slug: 'mneniya' },
  { name: 'Интервью', slug: 'intervyu' },
];

const CANONICAL_SLUGS = new Set(CANONICAL.map((c) => c.slug));

const DEFAULT_COLOR = '#14213D';

function isProtected(cat) {
  return (cat.name || '').trim() === PROTECTED_NAME;
}

/** Slugs that look like percent-encoded Cyrillic (broken), per project heuristic */
function isBrokenHexSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  const s = slug.toLowerCase();
  return s.length > 20 && (s.includes('d0') || s.includes('d1'));
}

function nameToCanonicalSlug(name) {
  const row = CANONICAL.find((c) => c.name === name.trim());
  return row ? row.slug : null;
}

async function upsertCanonical(strapi) {
  for (const { name, slug } of CANONICAL) {
    const existing = await strapi.db.query(UID).findOne({ where: { slug } });
    if (existing) {
      await strapi.entityService.update(UID, existing.id, {
        data: {
          name,
          slug,
          color: existing.color || DEFAULT_COLOR,
        },
      });
      console.log(`[upsert] updated: ${slug}`);
    } else {
      await strapi.entityService.create(UID, {
        data: {
          name,
          slug,
          color: DEFAULT_COLOR,
        },
      });
      console.log(`[upsert] created: ${slug}`);
    }
  }
}

async function deleteById(strapi, id, reason) {
  await strapi.entityService.delete(UID, id);
  console.log(`[delete] id=${id} (${reason})`);
}

async function removeBrokenHex(strapi) {
  const rows = await strapi.db.query(UID).findMany({ where: {} });
  for (const cat of rows) {
    if (isProtected(cat)) continue;
    if (isBrokenHexSlug(cat.slug)) {
      await deleteById(strapi, cat.id, 'broken hex-like slug');
    }
  }
}

async function removeOrphans(strapi) {
  const rows = await strapi.db.query(UID).findMany({ where: {} });
  for (const cat of rows) {
    if (isProtected(cat)) continue;
    if (!CANONICAL_SLUGS.has(cat.slug)) {
      await deleteById(strapi, cat.id, 'slug not in canonical list');
    }
  }
}

async function dedupeByName(strapi) {
  const rows = await strapi.db.query(UID).findMany({ where: {} });
  const byName = new Map();
  for (const cat of rows) {
    const key = (cat.name || '').trim();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(cat);
  }

  for (const [name, group] of byName) {
    if (group.length <= 1) continue;
    if (name === PROTECTED_NAME) {
      console.log(`[dedupe] skip ${group.length} rows named "${PROTECTED_NAME}"`);
      continue;
    }

    const wantSlug = nameToCanonicalSlug(name);
    let keeper = null;
    if (wantSlug) {
      keeper = group.find((r) => r.slug === wantSlug) || null;
    }
    if (!keeper) {
      keeper = [...group].sort((a, b) => a.id - b.id)[0];
    }

    for (const cat of group) {
      if (cat.id !== keeper.id) {
        await deleteById(strapi, cat.id, `duplicate name "${name}"`);
      }
    }
  }
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    console.log('--- upsert canonical categories ---');
    await upsertCanonical(app);

    console.log('--- remove broken hex slugs ---');
    await removeBrokenHex(app);

    console.log('--- remove non-canonical orphans (protected name kept) ---');
    await removeOrphans(app);

    console.log('--- dedupe by name ---');
    await dedupeByName(app);

    const finalRows = await app.db.query(UID).findMany({
      where: {},
      orderBy: [{ name: 'asc' }],
    });
    console.log('--- done. Categories:', finalRows.length);
    for (const r of finalRows) {
      console.log(`  - ${r.name} (${r.slug})`);
    }
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
