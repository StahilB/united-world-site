/**
 * Parse structured channel message into title, hashtags, body, author line.
 *
 * Expected layout:
 * ---
 * Title line
 * #category_slug #region_slug #format
 * ---
 * Markdown body
 * ---
 * Автор: Name
 * ---
 */

const FORMAT_ENUM = new Set(["анализ", "мнение", "интервью", "колонка", "обзор"]);

/**
 * Extract #hashtags from a line (Telegram-style, no space inside tag).
 * @param {string} line
 * @returns {string[]}
 */
function extractHashtags(line) {
  const re = /#([\w\u0400-\u04FF_]+)/gu;
  const out = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    out.push(m[1].toLowerCase());
  }
  return out;
}

/**
 * Map hashtag slug to Strapi format enum (aliases → canonical).
 * @param {string} slug
 * @returns {string | null}
 */
function normalizeFormatSlug(slug) {
  const s = slug.toLowerCase();
  const map = {
    анализ: "анализ",
    мнение: "мнение",
    интервью: "интервью",
    колонка: "колонка",
    обзор: "обзор",
  };
  if (map[s]) return map[s];
  if (FORMAT_ENUM.has(s)) return s;
  return null;
}

/**
 * @param {string} raw
 * @returns {{
 *   ok: true,
 *   title: string,
 *   categorySlug: string | null,
 *   regionSlug: string | null,
 *   format: string | null,
 *   bodyMarkdown: string,
 *   authorName: string | null,
 * } | { ok: false, error: string }}
 */
function parseMessage(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    return { ok: false, error: "Пустое сообщение" };
  }

  const parts = text
    .split(/\r?\n---\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return {
      ok: false,
      error:
        "Ожидаются минимум 3 блока, разделённых --- (заголовок и теги, текст, автор)",
    };
  }

  const headerBlock = parts[0];
  const authorBlock = parts[parts.length - 1];
  const bodyMarkdown = parts.slice(1, -1).join("\n\n---\n\n");

  const headerLines = headerBlock.split(/\r?\n/).map((l) => l.trim());
  const title = headerLines[0] || "";
  if (!title) {
    return { ok: false, error: "Первая строка заголовка пуста" };
  }

  const hashtagLine = headerLines.slice(1).join(" ");
  const tags = extractHashtags(hashtagLine);

  const categorySlug = tags[0] ?? null;
  const regionSlug = tags[1] ?? null;
  const formatSlug = tags[2] ?? null;

  let format = formatSlug ? normalizeFormatSlug(formatSlug) : null;
  if (formatSlug && !format) {
    return {
      ok: false,
      error: `Неизвестный формат «${formatSlug}». Допустимо: анализ, мнение, интервью, колонка, обзор`,
    };
  }

  let authorName = null;
  const authorMatch = authorBlock.match(/^автор\s*:\s*(.+)$/is);
  if (authorMatch) {
    authorName = authorMatch[1].trim().replace(/\s+---\s*$/s, "").trim();
  }

  if (!bodyMarkdown.trim()) {
    return { ok: false, error: "Текст статьи пуст" };
  }

  return {
    ok: true,
    title,
    categorySlug,
    regionSlug,
    format,
    bodyMarkdown: bodyMarkdown.trim(),
    authorName,
  };
}

module.exports = {
  parseMessage,
  extractHashtags,
  normalizeFormatSlug,
  FORMAT_ENUM,
};
