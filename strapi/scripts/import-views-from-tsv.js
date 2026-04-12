const fs = require('fs');
const path = require('path');

const STRAPI = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_TOKEN;
if (!TOKEN) { console.error('STRAPI_TOKEN required'); process.exit(1); }

function normalize(s) {
  return s.replace(/<[^>]+>/g, '').trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[«»""'']/g, '')
    .replace(/\u00a0/g, ' ');
}

async function main() {
  // Read TSV file (tab-separated: title \t views)
  const tsvPath = process.env.TSV_PATH || '/tmp/wp_views.tsv';
  const lines = fs.readFileSync(tsvPath, 'utf8').trim().split('\n');
  // Skip header line
  const wpData = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length >= 2) {
      const title = parts[0];
      const views = parseInt(parts[1], 10);
      if (title && views > 0) wpData.push({ title, views });
    }
  }
  console.log('[import-views] WP articles with views:', wpData.length);

  // Fetch all Strapi articles
  const strapiArticles = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${STRAPI}/api/articles?fields[0]=title&fields[1]=views_count&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    const json = await res.json();
    const items = json.data || [];
    if (items.length === 0) break;
    strapiArticles.push(...items);
    if (items.length < 100) break;
    page++;
  }
  console.log('[import-views] Strapi articles:', strapiArticles.length);

  // Build index by normalized title
  const byTitle = new Map();
  const byPrefix = new Map();
  for (const a of strapiArticles) {
    const n = normalize(a.title);
    byTitle.set(n, a);
    if (n.length >= 30) byPrefix.set(n.slice(0, 30), a);
  }

  let matched = 0, updated = 0, noMatch = 0, skipped = 0;

  for (const wp of wpData) {
    const n = normalize(wp.title);
    let article = byTitle.get(n);
    if (!article && n.length >= 30) article = byPrefix.get(n.slice(0, 30));
    
    // Also try first 40 chars
    if (!article && n.length >= 40) {
      for (const [key, val] of byTitle) {
        if (key.startsWith(n.slice(0, 40)) || n.startsWith(key.slice(0, 40))) {
          article = val;
          break;
        }
      }
    }

    if (!article) {
      noMatch++;
      console.log('✗ No match:', wp.title.slice(0, 60), '| views:', wp.views);
      continue;
    }

    matched++;
    if ((article.views_count || 0) >= wp.views) {
      skipped++;
      continue;
    }

    // Update views
    const putRes = await fetch(`${STRAPI}/api/articles/${article.documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { views_count: wp.views } }),
    });

    if (putRes.ok) {
      updated++;
      console.log('✓', wp.title.slice(0, 50), '→', wp.views, 'views');
    } else {
      console.log('✗ Update failed:', wp.title.slice(0, 50), putRes.status);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== RESULT ===');
  console.log('Matched:', matched, '| Updated:', updated, '| Skipped (already higher):', skipped, '| No match:', noMatch);
}

main().catch(e => { console.error(e); process.exit(1); });
