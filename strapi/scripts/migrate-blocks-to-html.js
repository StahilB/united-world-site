#!/usr/bin/env node
/**
 * Миграция: Strapi Blocks (JSON) → HTML в поле content_html (PostgreSQL).
 *
 * Подключение (как в config/database.ts):
 *   DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD
 * Опционально: DATABASE_SSL=true
 *
 * Загружает strapi/.env и strapi/.env.local при наличии.
 *
 * Запуск:
 *   DATABASE_HOST=localhost ... node scripts/migrate-blocks-to-html.js
 * или из контейнера:
 *   docker exec -i united-world-site-strapi-1 node scripts/migrate-blocks-to-html.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * Инлайны: text (bold/italic/underline/strikethrough/code), link.
 */
function renderInlineNodes(nodes) {
  if (nodes == null) return '';
  if (!Array.isArray(nodes)) return '';
  return nodes.map(renderInlineNode).join('');
}

function renderInlineNode(node) {
  if (node == null) return '';
  if (typeof node !== 'object') return '';
  const t = node.type;

  if (t === 'text') {
    let inner = escapeHtml(node.text ?? '');
    if (node.code) inner = `<code>${inner}</code>`;
    if (node.strikethrough) inner = `<s>${inner}</s>`;
    if (node.underline) inner = `<u>${inner}</u>`;
    if (node.italic) inner = `<em>${inner}</em>`;
    if (node.bold) inner = `<strong>${inner}</strong>`;
    return inner;
  }

  if (t === 'link') {
    const inner = renderInlineNodes(node.children);
    const href = escapeAttr(node.url || '#');
    return `<a href="${href}">${inner}</a>`;
  }

  if (Array.isArray(node.children)) {
    return renderInlineNodes(node.children);
  }

  return '';
}

function headingTag(level) {
  const n = typeof level === 'number' ? level : 2;
  if (n <= 1) return 'h2';
  if (n === 2) return 'h2';
  if (n === 3) return 'h3';
  if (n === 4) return 'h4';
  if (n === 5) return 'h5';
  if (n === 6) return 'h6';
  return 'h2';
}

function getImageUrl(imageBlock) {
  if (!imageBlock || typeof imageBlock !== 'object') return '';
  const img = imageBlock.image || imageBlock;
  if (typeof img === 'string') return img;
  if (img.url) return img.url;
  if (img.data?.attributes?.url) return img.data.attributes.url;
  const formats = img.formats;
  if (formats && typeof formats === 'object') {
    const large = formats.large || formats.medium || formats.small;
    if (large?.url) return large.url;
  }
  return '';
}

function getImageAlt(imageBlock) {
  if (!imageBlock || typeof imageBlock !== 'object') return '';
  const img = imageBlock.image || imageBlock;
  if (typeof img === 'string') return '';
  return (
    img.alternativeText ||
    img.caption ||
    img.alternative_text ||
    ''
  );
}

/**
 * Один элемент списка: list-item (часто с вложенным paragraph).
 */
function renderListItem(item) {
  if (!item || typeof item !== 'object') return '';
  const children = Array.isArray(item.children) ? item.children : [];
  const parts = [];
  for (const ch of children) {
    if (!ch || typeof ch !== 'object') continue;
    if (ch.type === 'paragraph') {
      parts.push(renderInlineNodes(ch.children));
    } else {
      parts.push(renderInlineNode(ch));
    }
  }
  const inner = parts.length ? parts.join('') : renderInlineNodes(children);
  return inner ? `<li>${inner}</li>` : '';
}

/**
 * Strapi Blocks JSON → HTML (логика согласована с src/lib/strapi-blocks-html.ts + инлайны).
 */
function blocksToHtml(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  const parts = [];

  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw;
    const type = block.type;

    if (type === 'paragraph') {
      const inner = renderInlineNodes(block.children);
      if (inner.trim()) {
        parts.push(`<p>${inner}</p>`);
      } else {
        parts.push('<p>&nbsp;</p>');
      }
      continue;
    }

    if (type === 'heading') {
      const tag = headingTag(block.level);
      const inner = renderInlineNodes(block.children);
      parts.push(`<${tag}>${inner}</${tag}>`);
      continue;
    }

    if (type === 'list') {
      const format = block.format === 'ordered' ? 'ol' : 'ul';
      const items = Array.isArray(block.children) ? block.children : [];
      const lis = items
        .map((item) => {
          if (item && item.type === 'list-item') {
            return renderListItem(item);
          }
          const inner = renderInlineNodes(
            Array.isArray(item?.children) ? item.children : [item].filter(Boolean),
          );
          return inner ? `<li>${inner}</li>` : '';
        })
        .filter(Boolean)
        .join('');
      if (lis) {
        parts.push(`<${format}>${lis}</${format}>`);
      }
      continue;
    }

    if (type === 'quote') {
      const inner = renderInlineNodes(block.children);
      if (inner.trim()) {
        parts.push(`<blockquote>${inner}</blockquote>`);
      }
      continue;
    }

    if (type === 'image') {
      const urlRaw = getImageUrl(block);
      if (!urlRaw) continue;
      const src = escapeAttr(urlRaw);
      const alt = escapeAttr(getImageAlt(block));
      parts.push(`<img src="${src}" alt="${alt}" />`);
      continue;
    }
  }

  return parts.join('\n');
}

function parseContentColumn(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw;
  }
  return null;
}

function isContentNonEmpty(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return true;
}

function isContentHtmlEmpty(val) {
  if (val == null) return true;
  const s = String(val).trim();
  return s.length === 0;
}

async function main() {
  const host = process.env.DATABASE_HOST || process.env.PGHOST || '127.0.0.1';
  const port = parseInt(process.env.DATABASE_PORT || process.env.PGPORT || '5432', 10);
  const database = process.env.DATABASE_NAME || process.env.PGDATABASE || 'strapi';
  const user = process.env.DATABASE_USERNAME || process.env.PGUSER || 'strapi';
  const password =
    process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || '';

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: false }
        : false,
  });

  await client.connect();

  const { rows } = await client.query(
    `SELECT id, content, content_html FROM articles ORDER BY id`,
  );

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const blocks = parseContentColumn(row.content);
    if (!isContentNonEmpty(blocks)) {
      skipped += 1;
      continue;
    }
    if (!isContentHtmlEmpty(row.content_html)) {
      skipped += 1;
      continue;
    }

    const html = blocksToHtml(blocks);
    await client.query(`UPDATE articles SET content_html = $1 WHERE id = $2`, [
      html,
      row.id,
    ]);
    migrated += 1;
  }

  await client.end();

  console.log(
    `[migrate-blocks-to-html] готово: мигрировано статей: ${migrated}, пропущено (нет blocks или уже есть HTML): ${skipped}`,
  );
}

main().catch((err) => {
  console.error('[migrate-blocks-to-html]', err);
  process.exit(1);
});
