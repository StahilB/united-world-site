'use strict';

/**
 * Seeds the single type `api::static-page.static-page` via Strapi REST API.
 * Requires STRAPI_TOKEN (API token with create/update on static-page).
 *
 * Run from strapi/: STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=xxx node scripts/seed-static-pages.js
 *
 * HTML fragments live in scripts/seed-static-pages-data/*.html
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'seed-static-pages-data');

function readUtf8(file) {
  return fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
}

async function main() {
  const token = process.env.STRAPI_TOKEN;
  if (!token || !String(token).trim()) {
    console.error('Set STRAPI_TOKEN in the environment (API token with rights to update static-page).');
    process.exit(1);
  }

  const base = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
  const url = `${base}/api/static-page`;

  const about_html = readUtf8('about.html');
  const cooperation_html = readUtf8('cooperation.html');
  const contacts_html = readUtf8('contacts.html');
  const support_html = readUtf8('support.html');
  const team_members = JSON.parse(readUtf8('team-members.json'));

  const body = {
    data: {
      about_html,
      cooperation_html,
      contacts_html,
      support_html,
      team_members,
    },
  };

  const opts = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  };

  let res = await fetch(url, { method: 'PUT', ...opts });
  if (res.status === 404 || res.status === 405) {
    res = await fetch(url, { method: 'POST', ...opts });
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`Strapi ${res.status} ${url}:`, text);
    process.exit(1);
  }

  console.log('OK: static-page updated.');
  try {
    const json = JSON.parse(text);
    console.log('documentId:', json?.data?.documentId ?? json?.data?.id ?? '—');
  } catch {
    console.log(text.slice(0, 200));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
