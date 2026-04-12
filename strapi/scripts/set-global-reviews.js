/**
 * Проставляет is_global_review = true для всех статей,
 * в заголовке которых есть слово "ежемесячн" или "глобальный обзор".
 *
 * Запуск: node scripts/set-global-reviews.js
 * Env: STRAPI_URL, STRAPI_TOKEN
 */

const STRAPI = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_TOKEN;
if (!TOKEN) { console.error('STRAPI_TOKEN required'); process.exit(1); }

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function fetchAll() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${STRAPI}/api/articles?fields[0]=title&fields[1]=is_global_review&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers }
    );
    const json = await res.json();
    const items = json.data || [];
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return all;
}

async function main() {
  const articles = await fetchAll();
  console.log('Total articles:', articles.length);

  let updated = 0;
  let alreadySet = 0;
  let notMatched = 0;

  for (const a of articles) {
    const lower = (a.title || '').toLowerCase();
    const isMonthly = lower.includes('ежемесячн') || lower.includes('глобальный обзор');

    if (!isMonthly) {
      notMatched++;
      continue;
    }

    if (a.is_global_review === true) {
      alreadySet++;
      console.log('⊘ Already set:', a.title.slice(0, 60));
      continue;
    }

    const res = await fetch(`${STRAPI}/api/articles/${a.documentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: { is_global_review: true } }),
    });

    if (res.ok) {
      updated++;
      console.log('✓ Set global_review:', a.title.slice(0, 60));
    } else {
      console.log('✗ Failed:', a.title.slice(0, 60), res.status);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== RESULT ===');
  console.log('Updated:', updated, '| Already set:', alreadySet, '| Not monthly:', notMatched);
}

main().catch(e => { console.error(e); process.exit(1); });
