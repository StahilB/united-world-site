/**
 * Strapi REST API: lookup entities, upload media, create article.
 */

const http = require("http");
const https = require("https");
const FormData = require("form-data");
const { marked } = require("marked");

/**
 * Convert Markdown to Strapi 5 Blocks field.
 * @param {string} markdown
 * @returns {object[]}
 */
function markdownToBlocks(markdown) {
  const tokens = marked.lexer(markdown, { gfm: true, breaks: true });
  const blocks = [];

  for (const token of tokens) {
    if (token.type === "space") continue;

    if (token.type === "paragraph") {
      blocks.push({
        type: "paragraph",
        children: inlineToChildren(token.tokens || []),
      });
      continue;
    }

    if (token.type === "heading") {
      blocks.push({
        type: "heading",
        level: Math.min(Math.max(token.depth || 2, 1), 6),
        children: inlineToChildren(token.tokens || []),
      });
      continue;
    }

    if (token.type === "blockquote") {
      const inner = token.tokens?.length
        ? token.tokens.flatMap((t) =>
            t.type === "paragraph" ? inlineToChildren(t.tokens || []) : [],
          )
        : [{ type: "text", text: token.text || "" }];
      blocks.push({
        type: "paragraph",
        children:
          inner.length > 0
            ? inner
            : [{ type: "text", text: token.text || "" }],
      });
      continue;
    }

    if (token.type === "list") {
      for (const item of token.items || []) {
        const text = item.text || "";
        blocks.push({
          type: "paragraph",
          children: [{ type: "text", text: `• ${text}` }],
        });
      }
      continue;
    }

    if (token.type === "code") {
      blocks.push({
        type: "paragraph",
        children: [{ type: "text", text: token.text }],
      });
      continue;
    }

    if (token.type === "hr") {
      blocks.push({
        type: "paragraph",
        children: [{ type: "text", text: "—" }],
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      children: [{ type: "text", text: token.raw || "" }],
    });
  }

  if (blocks.length === 0) {
    return [{ type: "paragraph", children: [{ type: "text", text: "" }] }];
  }
  return blocks;
}

/**
 * @param {object[]} tokens — marked inline tokens
 * @returns {object[]}
 */
function inlineToChildren(tokens) {
  if (!tokens || !tokens.length) {
    return [{ type: "text", text: "" }];
  }
  const out = [];
  for (const t of tokens) {
    if (t.type === "text") {
      out.push({ type: "text", text: t.text || "" });
    } else if (t.type === "strong") {
      const inner = inlineToChildren(t.tokens || []);
      if (inner.length === 0) {
        out.push({ type: "text", text: t.text || "", bold: true });
      } else {
        inner.forEach((c) => {
          out.push({ ...c, bold: true });
        });
      }
    } else if (t.type === "em") {
      const inner = inlineToChildren(t.tokens || []);
      if (inner.length === 0) {
        out.push({ type: "text", text: t.text || "", italic: true });
      } else {
        inner.forEach((c) => {
          out.push({ ...c, italic: true });
        });
      }
    } else if (t.type === "codespan") {
      out.push({ type: "text", text: t.text });
    } else if (t.type === "br") {
      out.push({ type: "text", text: "\n" });
    } else if (t.type === "link") {
      out.push({
        type: "text",
        text: t.text || t.href || "",
      });
    } else {
      out.push({ type: "text", text: t.raw || t.text || "" });
    }
  }
  return out.length ? out : [{ type: "text", text: "" }];
}

function createStrapiClient({ baseUrl, token }) {
  const origin = baseUrl.replace(/\/$/, "");
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  const revalidateSecret = process.env.REVALIDATE_SECRET || "";

  async function fetchJson(path, options = {}) {
    const url = path.startsWith("http") ? path : `${origin}${path}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg = json?.error?.message || text || res.statusText;
      const err = new Error(`Strapi ${res.status}: ${msg}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return json;
  }

  /**
   * @param {string} slug
   * @returns {Promise<{ id: number } | null>}
   */
  async function findCategoryBySlug(slug) {
    if (!slug) return null;
    const q = new URLSearchParams();
    q.set("filters[slug][$eq]", slug);
    q.set("pagination[pageSize]", "1");
    const data = await fetchJson(`/api/categories?${q.toString()}`);
    const row = data?.data?.[0];
    return row ? { id: row.id } : null;
  }

  /**
   * @param {string} slug
   * @returns {Promise<{ id: number } | null>}
   */
  async function findRegionBySlug(slug) {
    if (!slug) return null;
    const q = new URLSearchParams();
    q.set("filters[slug][$eq]", slug);
    q.set("pagination[pageSize]", "1");
    const data = await fetchJson(`/api/regions?${q.toString()}`);
    const row = data?.data?.[0];
    return row ? { id: row.id } : null;
  }

  /**
   * Exact name match (trimmed).
   * @param {string} name
   * @returns {Promise<{ id: number } | null>}
   */
  async function findAuthorByName(name) {
    if (!name || !name.trim()) return null;
    const q = new URLSearchParams();
    q.set("filters[name][$eq]", name.trim());
    q.set("pagination[pageSize]", "1");
    const data = await fetchJson(`/api/authors?${q.toString()}`);
    const row = data?.data?.[0];
    return row ? { id: row.id } : null;
  }

  /**
   * @param {string} name
   * @param {string} slug
   */
  async function createAuthor(name, slug) {
    const payload = {
      data: {
        name: name.trim(),
        slug,
      },
    };
    const data = await fetchJson("/api/authors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const row = data?.data;
    return row ? { id: row.id } : null;
  }

  /**
   * @param {Buffer} buffer
   * @param {string} filename
   * @returns {Promise<number | null>} media id
   */
  async function uploadImage(buffer, filename) {
    const form = new FormData();

    const ext = (filename || "").split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    };
    const contentType = mimeMap[ext] || "image/jpeg";

    form.append("files", buffer, {
      filename: filename || "cover.jpg",
      contentType,
      knownLength: buffer.length,
    });

    const url = `${origin}/api/upload`;
    console.log(
      `[strapi] POST ${url}, filename=${filename}, contentType=${contentType}, size=${buffer.length}`,
    );

    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port:
            parsed.port ||
            (parsed.protocol === "https:" ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...form.getHeaders(),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            console.log(
              `[strapi] upload response: ${res.statusCode} ${data.slice(0, 200)}`,
            );
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Upload ${res.statusCode}: ${data}`));
              return;
            }
            try {
              const json = JSON.parse(data);
              const file = Array.isArray(json) ? json[0] : json?.[0];
              resolve(file?.id ?? null);
            } catch {
              reject(new Error(`Upload parse error: ${data.slice(0, 200)}`));
            }
          });
        },
      );

      req.on("error", (e) => {
        console.error("[strapi] upload request error:", e.message);
        reject(e);
      });

      form.pipe(req);
    });
  }

  /**
   * @param {object} params
   * @returns {Promise<{ id: number; slug: string }>}
   */
  async function createArticle(params) {
    const {
      title,
      slug,
      htmlBody,
      excerpt,
      format,
      authorId,
      categoryId,
      regionId,
      coverImageId,
      readingTime,
      publicationDate,
    } = params;

    const data = {
      title,
      slug,
      content_html: htmlBody,
      format: format || "анализ",
      reading_time: readingTime,
      publication_date: publicationDate || new Date().toISOString(),
    };

    if (excerpt) {
      data.excerpt = excerpt;
    }

    if (authorId != null) {
      data.author = authorId;
    }
    if (categoryId != null) {
      data.categories = [categoryId];
    }
    if (regionId != null) {
      data.region = regionId;
    }
    if (coverImageId != null) {
      data.cover_image = coverImageId;
    }

    const res = await fetchJson("/api/articles", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    const row = res?.data;
    if (!row?.id) {
      throw new Error("Strapi не вернул созданную статью");
    }
    const created = { id: row.id, slug: row.slug || slug };

    if (siteUrl && revalidateSecret) {
      try {
        await fetch(`${siteUrl}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({ slug: created.slug, path: "/" }),
        });
      } catch (e) {
        console.error("[revalidate] request failed:", e?.message || e);
      }
    }

    return created;
  }

  return {
    fetchJson,
    findCategoryBySlug,
    findRegionBySlug,
    findAuthorByName,
    createAuthor,
    uploadImage,
    createArticle,
    markdownToBlocks,
    async getRecentArticles(limit = 5) {
      const q = new URLSearchParams();
      q.set("sort[0]", "publication_date:desc");
      q.set("pagination[pageSize]", String(limit));
      q.set("pagination[page]", "1");
      q.set("fields[0]", "title");
      q.set("fields[1]", "slug");
      const data = await fetchJson(`/api/articles?${q.toString()}`);
      return (data?.data || []).map((x) => ({
        title: x.title,
        slug: x.slug,
      }));
    },
  };
}

module.exports = {
  createStrapiClient,
  markdownToBlocks,
};
