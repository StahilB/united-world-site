'use strict';

/**
 * One-shot (idempotent) seed for api::section.section navigation tree.
 * Run from strapi/: npm run seed-sections
 *
 * Does not touch Category, Region, Author, or Article beyond the new sections relation target.
 */

const { compileStrapi, createStrapi } = require('@strapi/core');

const UID = 'api::section.section';

/** @type {{ name: string; slug: string; order: number }[]} */
const LEVEL1 = [
  { name: 'Аналитика', slug: 'analitika', order: 0 },
  { name: 'Экспертиза', slug: 'ekspertiza', order: 1 },
  { name: 'Вики', slug: 'viki', order: 2 },
  { name: 'О центре', slug: 'o-tsentre', order: 3 },
  { name: 'EN', slug: 'en', order: 4 },
];

/** parent slug -> children */
const LEVEL2 = {
  analitika: [
    { name: 'По регионам', slug: 'po-regionam', order: 0 },
    { name: 'По темам', slug: 'po-temam', order: 1 },
    { name: 'Ситуативный анализ', slug: 'situativnyy-analiz', order: 2 },
    { name: 'Глобальные обзоры', slug: 'globalnye-obzory', order: 3 },
  ],
  ekspertiza: [
    { name: 'Мнения', slug: 'mneniya-ekspertiza', order: 0 },
    { name: 'Интервью', slug: 'intervyu-ekspertiza', order: 1 },
    { name: 'Авторские колонки', slug: 'avtorskie-kolonki-ekspertiza', order: 2 },
  ],
  viki: [
    { name: 'Страны и регионы', slug: 'strany-i-regiony', order: 0 },
    { name: 'Международные организации', slug: 'mezhdunarodnye-organizatsii-viki', order: 1 },
    { name: 'Персоналии', slug: 'personalii', order: 2 },
    { name: 'Термины и понятия', slug: 'terminy-i-ponyatiya', order: 3 },
    { name: 'Конфликты и кризисы', slug: 'konflikty-i-krizisy', order: 4 },
    { name: 'Интеграционные объединения', slug: 'integratsionnye-obedineniya', order: 5 },
    { name: 'Международные мероприятия', slug: 'mezhdunarodnye-meropriyatiya-viki', order: 6 },
    { name: 'История международных отношений', slug: 'istoriya-mezhdunarodnyh-otnosheniy', order: 7 },
  ],
  'o-tsentre': [
    { name: 'Об организации', slug: 'ob-organizatsii', order: 0 },
    { name: 'Команда', slug: 'komanda', order: 1 },
    { name: 'Сотрудничество', slug: 'sotrudnichestvo', order: 2 },
    { name: 'Новости', slug: 'novosti', order: 3 },
    { name: 'Контакты', slug: 'kontakty', order: 4 },
  ],
};

const REGION_ROWS = [
  { name: 'Россия', base: 'rossiya' },
  { name: 'Европа', base: 'evropa' },
  { name: 'Ближний Восток', base: 'blizhniy-vostok' },
  { name: 'Африка', base: 'afrika' },
  { name: 'Латинская Америка', base: 'latinskaya-amerika' },
  { name: 'Кавказ', base: 'kavkaz' },
  { name: 'Центральная Азия', base: 'tsentralnaya-aziya' },
  { name: 'Южная Азия', base: 'yuzhnaya-aziya' },
  { name: 'Юго-Восточная Азия', base: 'yugo-vostochnaya-aziya' },
  { name: 'Восточная Азия и АТР', base: 'vostochnaya-aziya-i-atp' },
  { name: 'Северная Америка', base: 'severnaya-amerika' },
  { name: 'Австралия и Океания', base: 'avstraliya-i-okeaniya' },
  { name: 'Арктика', base: 'arktika' },
];

const LEVEL3_PO_REGION = REGION_ROWS.map((r, i) => ({
  name: r.name,
  slug: `${r.base}-po-regionam`,
  order: i,
}));

const LEVEL3_GLOBAL = REGION_ROWS.map((r, i) => ({
  name: r.name,
  slug: `${r.base}-globalnye-obzory`,
  order: i,
}));

const LEVEL3_PO_TEM = [
  { name: 'Международная безопасность', slug: 'mezhdunarodnaya-bezopasnost-po-temam', order: 0 },
  { name: 'Политика и дипломатия', slug: 'politika-i-diplomatiya-po-temam', order: 1 },
  { name: 'Экономика и развитие', slug: 'ekonomika-i-razvitie-po-temam', order: 2 },
  { name: 'Энергия и ресурсы', slug: 'energiya-i-resursy-po-temam', order: 3 },
  { name: 'Экология и климат', slug: 'ekologiya-i-klimat-po-temam', order: 4 },
  { name: 'Образование наука и культура', slug: 'obrazovanie-nauka-i-kultura-po-temam', order: 5 },
  { name: 'Международные организации', slug: 'mezhdunarodnye-organizatsii-po-temam', order: 6 },
  { name: 'Международные мероприятия', slug: 'mezhdunarodnye-meropriyatiya-po-temam', order: 7 },
];

async function upsertSection(strapi, { name, slug, order, parentId }) {
  const existing = await strapi.db.query(UID).findOne({ where: { slug } });
  const data = {
    name,
    slug,
    order,
    is_visible_in_menu: true,
    ...(parentId != null ? { parent: parentId } : { parent: null }),
  };

  if (existing) {
    await strapi.entityService.update(UID, existing.id, { data });
    console.log(`[seed-sections] updated: ${slug}`);
    return existing.id;
  }

  const created = await strapi.entityService.create(UID, { data });
  console.log(`[seed-sections] created: ${slug}`);
  return created.id;
}

async function resolveParentId(strapi, parentSlug) {
  const row = await strapi.db.query(UID).findOne({ where: { slug: parentSlug } });
  if (!row) {
    throw new Error(`Parent section not found: ${parentSlug}`);
  }
  return row.id;
}

async function seed(strapi) {
  for (const row of LEVEL1) {
    await upsertSection(strapi, {
      name: row.name,
      slug: row.slug,
      order: row.order,
      parentId: null,
    });
  }

  for (const [parentSlug, children] of Object.entries(LEVEL2)) {
    const parentId = await resolveParentId(strapi, parentSlug);
    for (const ch of children) {
      await upsertSection(strapi, {
        name: ch.name,
        slug: ch.slug,
        order: ch.order,
        parentId,
      });
    }
  }

  const poRegionamId = await resolveParentId(strapi, 'po-regionam');
  for (const row of LEVEL3_PO_REGION) {
    await upsertSection(strapi, {
      name: row.name,
      slug: row.slug,
      order: row.order,
      parentId: poRegionamId,
    });
  }

  const globalId = await resolveParentId(strapi, 'globalnye-obzory');
  for (const row of LEVEL3_GLOBAL) {
    await upsertSection(strapi, {
      name: row.name,
      slug: row.slug,
      order: row.order,
      parentId: globalId,
    });
  }

  const poTemId = await resolveParentId(strapi, 'po-temam');
  for (const row of LEVEL3_PO_TEM) {
    await upsertSection(strapi, {
      name: row.name,
      slug: row.slug,
      order: row.order,
      parentId: poTemId,
    });
  }

  const all = await strapi.db.query(UID).findMany({ where: {} });
  console.log(`[seed-sections] done. Total sections: ${all.length}`);
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  try {
    await seed(app);
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
