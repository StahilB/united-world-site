'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Mapping: author slug -> old WordPress photo URL.
// Slugs are aligned with current Strapi data dump.
const PHOTO_MAP = {
  'vladislav-fedorov': 'https://anounitedworld.com/wp-content/uploads/2025/05/1-3-725x1024.jpg',
  'stanislav-bukin': 'https://anounitedworld.com/wp-content/uploads/2025/05/2-768x1024.jpg',
  'artyom-panchin': 'https://anounitedworld.com/wp-content/uploads/2025/05/3-768x1024.jpg',
  'elena-schuryakova': 'https://anounitedworld.com/wp-content/uploads/2025/05/4-914x1024.jpg',
  'andrey-vildyaev': 'https://anounitedworld.com/wp-content/uploads/2025/05/5.jpg',
  'anastasiya-yusupova-vdovina': 'https://anounitedworld.com/wp-content/uploads/2025/05/6.jpg',
  'almir-ishakov': 'https://anounitedworld.com/wp-content/uploads/2025/05/8-2.jpg',
  'igor-bahlov': 'https://anounitedworld.com/wp-content/uploads/2025/05/%D0%91%D0%B0%D1%85%D0%BB%D0%BE%D0%B2-678x1024.jpg',
  'olga-bahlova': 'https://anounitedworld.com/wp-content/uploads/2025/05/%D0%91%D0%B0%D1%85%D0%BB%D0%BE%D0%B2%D0%B0.jpg',
  'tatyana-dadaeva': 'https://anounitedworld.com/wp-content/uploads/2025/05/%D0%94%D0%B0%D0%B4%D0%B0%D0%B5%D0%B2%D0%B0.jpg',
  'kseniya-musatova': 'https://anounitedworld.com/wp-content/uploads/2025/05/%D0%9C%D1%83%D1%81%D0%B0%D1%82%D0%BE%D0%B2%D0%B0.jpg',
};

async function getAuthorBySlug(slug) {
  const url = `${STRAPI_URL}/api/authors?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[photo]=true&pagination[pageSize]=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  });
  if (!res.ok) throw new Error(`getAuthor ${slug}: ${res.status}`);
  const data = await res.json();
  return data.data?.[0] ?? null;
}

async function downloadToTmp(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const tmp = path.join(os.tmpdir(), `author-${Date.now()}${ext}`);
  fs.writeFileSync(tmp, buf);
  return tmp;
}

async function uploadToStrapi(filePath, authorSlug) {
  const { Blob } = require('buffer');
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf]);
  const form = new FormData();
  form.append('files', blob, path.basename(filePath));
  form.append(
    'fileInfo',
    JSON.stringify({
      name: `photo-${authorSlug}`,
      alternativeText: authorSlug,
    }),
  );
  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload: ${res.status} ${await res.text()}`);
  const arr = await res.json();
  return arr[0]?.id;
}

async function attachPhotoToAuthor(documentId, mediaId) {
  const res = await fetch(`${STRAPI_URL}/api/authors/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify({ data: { photo: mediaId } }),
  });
  if (!res.ok) throw new Error(`attach: ${res.status} ${await res.text()}`);
}

async function main() {
  if (!STRAPI_TOKEN) {
    console.error('Set STRAPI_TOKEN env var');
    process.exit(1);
  }

  for (const [slug, photoUrl] of Object.entries(PHOTO_MAP)) {
    try {
      const author = await getAuthorBySlug(slug);
      if (!author) {
        console.log(`[SKIP] author not found: ${slug}`);
        continue;
      }
      if (author.photo) {
        console.log(`[SKIP] ${author.name} already has photo`);
        continue;
      }
      console.log(`[PROC] ${author.name}: downloading ${photoUrl}`);
      const tmp = await downloadToTmp(photoUrl);
      const mediaId = await uploadToStrapi(tmp, slug);
      await attachPhotoToAuthor(author.documentId, mediaId);
      fs.unlinkSync(tmp);
      console.log(`[OK]   ${author.name} -> mediaId=${mediaId}`);
    } catch (err) {
      console.error(`[ERR]  ${slug}:`, err.message);
    }
  }
}

main().catch(console.error);
