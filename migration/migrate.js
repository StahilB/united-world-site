/**
 * WordPress → Strapi migration (REST API).
 * Run: node migration/migrate.js (from repo root) or cd migration && node migrate.js
 *
 * Env: STRAPI_URL, STRAPI_TOKEN, WP_BASE_URL (optional, default https://anounitedworld.com)
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const FormData = require("form-data");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const WP_BASE = (
  process.env.WP_BASE_URL || "https://anounitedworld.com"
).replace(/\/$/, "");
const STRAPI = (process.env.STRAPI_URL || "http://localhost:1337").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.STRAPI_TOKEN;
const OUT_DIR = path.join(__dirname, "output");

if (!TOKEN) {
  console.error("STRAPI_TOKEN is required (API token with create + upload).");
  process.exit(1);
}

/** Known Strapi region slugs (match WP category slug after normalize). */
const REGION_SLUG_HINTS = new Set([
  "afrika",
  "latinskaya-amerika",
  "kavkaz",
  "blizhniy-vostok",
  "tsentralnaya-aziya",
  "yuzhnaya-aziya",
  "severnaya-amerika",
  "yugo-vostochnaya-aziya",
  "vostochnaya-aziya-i-atr",
  "avstraliya-i-okeaniya",
  "rossiya",
  "evropa",
  "arktika",
  "africa",
  "latin-america",
  "caucasus",
  "middle-east",
  "central-asia",
  "south-asia",
  "north-america",
  "southeast-asia",
  "east-asia",
  "russia",
  "europe",
  "arctic",
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...opts.headers,
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || text || res.statusText;
    throw new Error(`${res.status} ${url}: ${msg}`);
  }
  return data;
}

async function strapiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${STRAPI}${path}`;
  return fetchJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/** Paginate WP collection (posts, categories, users). */
async function fetchAllWp(endpoint, params = {}) {
  const items = [];
  let page = 1;
  const search = new URLSearchParams({ per_page: "100", ...params });
  for (;;) {
    search.set("page", String(page));
    const url = `${WP_BASE}/wp-json/wp/v2/${endpoint}?${search.toString()}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    items.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
    await sleep(150);
  }
  return items;
}

/** Paginate Strapi collection API. */
async function fetchAllStrapi(plural) {
  const all = [];
  let page = 1;
  for (;;) {
    const q = new URLSearchParams();
    q.set("pagination[page]", String(page));
    q.set("pagination[pageSize]", "100");
    const res = await strapiFetch(`/api/${plural}?${q.toString()}`);
    const rows = res?.data || [];
    all.push(...rows);
    if (rows.length < 100) break;
    page += 1;
    await sleep(100);
  }
  return all;
}

function normalizeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Convert HTML body to Strapi 5 blocks (subset).
 * @param {string} html
 */
function htmlToBlocks(html) {
  if (!html || !String(html).trim()) {
    return [{ type: "paragraph", children: [{ type: "text", text: "" }] }];
  }
  const $ = cheerio.load(`<div id="mw-root">${html}</div>`, null, false);
  const blocks = [];
  $("#mw-root")
    .children()
    .each((_, el) => {
      const $el = $(el);
      const tag = el.tagName?.toLowerCase() || "";
      const text = $el.text().replace(/\s+/g, " ").trim();
      if (tag === "p") {
        if (text) {
          blocks.push({
            type: "paragraph",
            children: [{ type: "text", text }],
          });
        }
        return;
      }
      if (/^h[1-6]$/.test(tag)) {
        const level = Math.min(parseInt(tag[1], 10), 6);
        blocks.push({
          type: "heading",
          level,
          children: [{ type: "text", text: text || "" }],
        });
        return;
      }
      if (tag === "ul" || tag === "ol") {
        $el.find("li").each((__, li) => {
          const t = $(li).text().replace(/\s+/g, " ").trim();
          if (t) {
            blocks.push({
              type: "paragraph",
              children: [{ type: "text", text: `• ${t}` }],
            });
          }
        });
        return;
      }
      if (tag === "blockquote") {
        if (text) {
          blocks.push({
            type: "paragraph",
            children: [{ type: "text", text }],
          });
        }
        return;
      }
      if (text) {
        blocks.push({
          type: "paragraph",
          children: [{ type: "text", text }],
        });
      }
    });

  return blocks.length
    ? blocks
    : [{ type: "paragraph", children: [{ type: "text", text: "" }] }];
}

function stripHtml(html) {
  return cheerio.load(html || "", null, false).text().replace(/\s+/g, " ").trim();
}

function wordCount(text) {
  const m = String(text).trim().match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

function readingTimeMinutes(text) {
  const n = wordCount(text);
  return Math.max(1, Math.ceil(n / 200));
}

function slugFromTitle(title) {
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  let out = "";
  for (const ch of title.toLowerCase()) {
    if (map[ch] !== undefined) out += map[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (ch === " " || ch === "-") out += "-";
  }
  return (
    out
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96) || "article"
  );
}

async function uploadImage(buffer, filename) {
  const form = new FormData();
  form.append("files", buffer, { filename });
  const url = `${STRAPI}/api/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...form.getHeaders(),
    },
    body: form,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(`Upload ${res.status}: ${text}`);
  }
  const file = Array.isArray(json) ? json[0] : json?.[0];
  return file?.id ?? null;
}

async function findAuthorByName(name) {
  if (!name?.trim()) return null;
  const q = new URLSearchParams();
  q.set("filters[name][$eq]", name.trim());
  q.set("pagination[pageSize]", "1");
  const res = await strapiFetch(`/api/authors?${q.toString()}`);
  const row = res?.data?.[0];
  return row ? row.id : null;
}

async function createAuthor(name, slug) {
  const res = await strapiFetch("/api/authors", {
    method: "POST",
    body: JSON.stringify({
      data: { name: name.trim(), slug },
    }),
  });
  return res?.data?.id ?? null;
}

async function ensureAuthorId(displayName) {
  const name = displayName?.trim() || "Редакция";
  let id = await findAuthorByName(name);
  if (id) return id;
  let base = slugFromTitle(name);
  if (!base) base = "author";
  for (let i = 0; i < 6; i += 1) {
    const slug = i === 0 ? base : `${base}-${Date.now()}`;
    try {
      id = await createAuthor(name, slug);
      if (id) return id;
    } catch (e) {
      if (String(e.message).includes("400") || String(e.message).includes("slug")) {
        continue;
      }
      throw e;
    }
  }
  return null;
}

/**
 * From WP category ids, resolve Strapi category id and region id (first matches).
 */
function resolveTaxonomy(wpCategoryIds, wpCategoriesById, strapiCatsBySlug, strapiRegsBySlug) {
  let categoryId = null;
  let regionId = null;

  for (const cid of wpCategoryIds || []) {
    const wc = wpCategoriesById.get(cid);
    if (!wc) continue;
    const slug = normalizeSlug(wc.slug);
    if (REGION_SLUG_HINTS.has(slug) || strapiRegsBySlug.has(slug)) {
      const r = strapiRegsBySlug.get(slug);
      if (r && !regionId) regionId = r.id;
    } else if (strapiCatsBySlug.has(slug)) {
      const c = strapiCatsBySlug.get(slug);
      if (c && !categoryId) categoryId = c.id;
    }
  }

  for (const cid of wpCategoryIds || []) {
    const wc = wpCategoriesById.get(cid);
    if (!wc) continue;
    const slug = normalizeSlug(wc.slug);
    if (!categoryId && strapiCatsBySlug.has(slug)) {
      categoryId = strapiCatsBySlug.get(slug).id;
    }
    if (!regionId && strapiRegsBySlug.has(slug)) {
      regionId = strapiRegsBySlug.get(slug).id;
    }
  }

  return { categoryId, regionId };
}

async function postStrapiArticle(payload) {
  const data = {
    title: payload.title,
    slug: payload.slug,
    content: payload.content,
    format: payload.format || "анализ",
    reading_time: payload.reading_time,
  };

  if (payload.excerpt) data.excerpt = String(payload.excerpt).slice(0, 300);
  if (payload.publication_date) data.publication_date = payload.publication_date;
  if (payload.authorId != null) data.author = payload.authorId;
  if (payload.categoryId != null) data.categories = [payload.categoryId];
  if (payload.regionId != null) data.region = payload.regionId;
  if (payload.coverImageId != null) data.cover_image = payload.coverImageId;

  const res = await strapiFetch("/api/articles", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
  return res?.data;
}

async function createArticleWithUniqueSlug(baseSlug, buildPayload) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < 10) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-wp-${Date.now().toString(36)}-${attempt}`;
    try {
      const payload = buildPayload(slug);
      const row = await postStrapiArticle(payload);
      if (row?.slug) return row;
      if (row) return { ...row, slug };
      throw new Error("Empty Strapi response");
    } catch (e) {
      lastErr = e;
      const msg = String(e.message || "").toLowerCase();
      if (
        msg.includes("unique") ||
        msg.includes("slug") ||
        msg.includes("already exists") ||
        msg.includes(" 400 ")
      ) {
        attempt += 1;
        await sleep(200);
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Could not create article");
}

async function getFeaturedImageUrl(post) {
  const emb = post._embedded?.["wp:featuredmedia"]?.[0];
  if (emb?.source_url) return emb.source_url;
  const mid = post.featured_media;
  if (!mid) return null;
  try {
    const media = await fetchJson(
      `${WP_BASE}/wp-json/wp/v2/media/${mid}`,
    );
    return media?.source_url || null;
  } catch {
    return null;
  }
}

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  let ext = "jpg";
  if (ct.includes("png")) ext = "png";
  else if (ct.includes("webp")) ext = "webp";
  else if (ct.includes("gif")) ext = "gif";
  return { buffer: buf, ext };
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function main() {
  console.log(`WP: ${WP_BASE}`);
  console.log(`Strapi: ${STRAPI}`);
  ensureOutDir();

  const errors = [];
  let migrated = 0;

  console.log("Fetching WordPress posts…");
  const posts = await fetchAllWp("posts", { _embed: "1" });
  console.log(`  posts: ${posts.length}`);

  console.log("Fetching WordPress categories…");
  const wpCategories = await fetchAllWp("categories");
  const wpCategoriesById = new Map(wpCategories.map((c) => [c.id, c]));
  console.log(`  categories: ${wpCategories.length}`);

  console.log("Fetching WordPress users…");
  const wpUsers = await fetchAllWp("users");
  const wpUsersById = new Map(wpUsers.map((u) => [u.id, u]));
  console.log(`  users: ${wpUsers.length}`);

  console.log("Fetching Strapi categories & regions…");
  const strapiCats = await fetchAllStrapi("categories");
  const strapiRegs = await fetchAllStrapi("regions");
  const strapiCatsBySlug = new Map(
    strapiCats.map((c) => [normalizeSlug(c.slug), c]),
  );
  const strapiRegsBySlug = new Map(
    strapiRegs.map((r) => [normalizeSlug(r.slug), r]),
  );
  console.log(`  Strapi categories: ${strapiCats.length}, regions: ${strapiRegs.length}`);

  const redirects = [];
  const mapping = [];

  for (const post of posts) {
    const title = post.title?.rendered
      ? cheerio.load(post.title.rendered).text()
      : post.slug;
    const html = post.content?.rendered || "";
    const plain = stripHtml(html);
    const excerpt = (post.excerpt?.rendered
      ? stripHtml(post.excerpt.rendered)
      : plain
    ).slice(0, 300);

    const wpAuthor = wpUsersById.get(post.author);
    const authorName = wpAuthor?.name || "Редакция";

    let oldPath = "/";
    try {
      oldPath = new URL(post.link || `${WP_BASE}/?p=${post.id}`).pathname || "/";
    } catch {
      oldPath = "/";
    }
    if (!oldPath.startsWith("/")) oldPath = `/${oldPath}`;
    oldPath = oldPath.replace(/\/{2,}/g, "/") || "/";

    const baseSlug = normalizeSlug(post.slug) || slugFromTitle(title);

    const { categoryId, regionId } = resolveTaxonomy(
      post.categories,
      wpCategoriesById,
      strapiCatsBySlug,
      strapiRegsBySlug,
    );

    let coverImageId = null;
    try {
      const imgUrl = await getFeaturedImageUrl(post);
      if (imgUrl) {
        const { buffer, ext } = await downloadFile(imgUrl);
        coverImageId = await uploadImage(buffer, `wp-${post.id}.${ext}`);
        await sleep(100);
      }
    } catch (e) {
      console.warn(`  [post ${post.id}] cover image: ${e.message}`);
      errors.push({ postId: post.id, step: "cover", error: e.message });
    }

    let authorId = null;
    try {
      authorId = await ensureAuthorId(authorName);
    } catch (e) {
      console.warn(`  [post ${post.id}] author: ${e.message}`);
      errors.push({ postId: post.id, step: "author", error: e.message });
    }

    const content = htmlToBlocks(html);
    const reading_time = readingTimeMinutes(plain);
    const publication_date = post.date || null;

    try {
      const row = await createArticleWithUniqueSlug(baseSlug, (slug) => ({
        title,
        slug,
        content,
        excerpt,
        format: "анализ",
        reading_time,
        publication_date,
        authorId,
        categoryId,
        regionId,
        coverImageId,
      }));

      const newSlug = row.slug || baseSlug;
      migrated += 1;
      mapping.push({
        wp_id: post.id,
        old_url: post.link,
        old_path: oldPath,
        new_slug: newSlug,
        strapi_document_id: row.documentId,
      });

      const targetPath = `/articles/${newSlug}`;
      redirects.push({ oldPath, targetPath });

      console.log(`  OK ${post.id} → /articles/${newSlug}`);
    } catch (e) {
      console.error(`  FAIL post ${post.id}: ${e.message}`);
      errors.push({ postId: post.id, step: "create", error: e.message });
    }

    await sleep(200);
  }

  const redirectsPath = path.join(OUT_DIR, "_redirects");
  const nginxPath = path.join(OUT_DIR, "nginx-redirects.map");
  const mappingPath = path.join(OUT_DIR, "url-mapping.json");

  const redirectsContent = redirects
    .map((r) => `${r.oldPath}\t${r.targetPath}\t301`)
    .join("\n");
  fs.writeFileSync(redirectsPath, redirectsContent + "\n", "utf8");

  const nginxContent =
    "# Include inside `server { }` for WordPress → Next.js (301)\n" +
    redirects
      .map(
        (r) =>
          `rewrite ^${escapeRegex(r.oldPath)}$ ${r.targetPath} permanent;`,
      )
      .join("\n") +
    "\n";
  fs.writeFileSync(nginxPath, nginxContent, "utf8");

  fs.writeFileSync(
    mappingPath,
    JSON.stringify({ migrated, errors, mapping }, null, 2),
    "utf8",
  );

  console.log("\n--- Summary ---");
  console.log(`Migrated: ${migrated}`);
  console.log(`Errors:   ${errors.length}`);
  console.log(`Written:  ${redirectsPath}`);
  console.log(`          ${nginxPath}`);
  console.log(`          ${mappingPath}`);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
