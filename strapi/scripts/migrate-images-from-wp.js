const path = require('path');

const WP_BASE = 'https://anounitedworld.com';
const STRAPI = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_TOKEN;
if (!TOKEN) { console.error('STRAPI_TOKEN required'); process.exit(1); }

function normalize(s) {
  return s.replace(/<[^>]+>/g, '').trim().toLowerCase()
    .replace(/\s+/g, ' ').replace(/[«»""'']/g, '').replace(/\u00a0/g, ' ');
}

async function fetchAllWP() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${WP_BASE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed`;
    console.log('Fetching WP page', page);
    const res = await fetch(url);
    if (!res.ok) break;
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;
    all.push(...posts);
    if (posts.length < 100) break;
    page++;
    await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

function getImageUrl(post) {
  try {
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    if (!media) return null;
    const sizes = media.media_details?.sizes;
    return sizes?.large?.source_url
      || sizes?.medium_large?.source_url
      || media.source_url
      || null;
  } catch { return null; }
}

async function fetchAllStrapi() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${STRAPI}/api/articles?fields[0]=title&fields[1]=slug&populate[cover_image][fields][0]=url&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
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
  console.log('Fetching WordPress posts...');
  const wpPosts = await fetchAllWP();
  console.log('WP posts:', wpPosts.length);

  console.log('Fetching Strapi articles...');
  const strapiArticles = await fetchAllStrapi();
  console.log('Strapi articles:', strapiArticles.length);

  // Build indexes
  const byTitle = new Map();
  const byPrefix = new Map();
  for (const a of strapiArticles) {
    const n = normalize(a.title);
    const hasImage = !!(a.cover_image?.url);
    byTitle.set(n, { ...a, hasImage });
    if (n.length >= 30) byPrefix.set(n.slice(0, 30), { ...a, hasImage });
  }

  let uploaded = 0, skipped = 0, noMatch = 0, noImage = 0, errors = 0;

  for (const wp of wpPosts) {
    const imageUrl = getImageUrl(wp);
    if (!imageUrl) { noImage++; continue; }

    const wpTitle = normalize(wp.title?.rendered || '');
    let article = byTitle.get(wpTitle);
    if (!article && wpTitle.length >= 30) article = byPrefix.get(wpTitle.slice(0, 30));
    
    // Fuzzy match
    if (!article && wpTitle.length >= 40) {
      for (const [key, val] of byTitle) {
        if (key.startsWith(wpTitle.slice(0, 40)) || wpTitle.startsWith(key.slice(0, 40))) {
          article = val;
          break;
        }
      }
    }

    if (!article) {
      noMatch++;
      console.log('✗ No match:', (wp.title?.rendered || '').slice(0, 50));
      continue;
    }

    if (article.hasImage) {
      skipped++;
      continue;
    }

    // Download image
    let buffer;
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!imgRes.ok) { errors++; console.log('✗ Download failed:', imageUrl); continue; }
      buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length > 10 * 1024 * 1024) {
        console.log('⚠ Too large (>10MB), skipping:', imageUrl);
        errors++;
        continue;
      }
    } catch (e) {
      errors++;
      console.log('✗ Download error:', imageUrl, e.message);
      continue;
    }

    // Upload to Strapi
    const filename = path.basename(new URL(imageUrl).pathname) || 'cover.jpg';
    const form = new FormData();
    form.append('files', new Blob([buffer]), filename);
    form.append('ref', 'api::article.article');
    form.append('refId', article.documentId);
    form.append('field', 'cover_image');

    try {
      const upRes = await fetch(`${STRAPI}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: form,
      });
      if (upRes.ok) {
        uploaded++;
        console.log('✓ Uploaded:', (wp.title?.rendered || '').slice(0, 50), '→', filename);
      } else {
        errors++;
        const errText = await upRes.text();
        console.log('✗ Upload failed:', (wp.title?.rendered || '').slice(0, 50), upRes.status, errText.slice(0, 100));
      }
    } catch (e) {
      errors++;
      console.log('✗ Upload error:', e.message);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== RESULT ===');
  console.log('Uploaded:', uploaded);
  console.log('Skipped (has image):', skipped);
  console.log('No match:', noMatch);
  console.log('No featured image in WP:', noImage);
  console.log('Errors:', errors);
}

main().catch(e => { console.error(e); process.exit(1); });
