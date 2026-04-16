/**
 * Parse Telegram channel messages.
 *
 * New flow (long articles):
 * - First message:
 *   Title
 *   #category #region #format
 *   Автор: Имя Фамилия
 *
 *   Body...
 * - Continuations are plain text; bot concatenates them.
 */

const FORMAT_ENUM = new Set(["анализ", "мнение", "интервью", "колонка", "обзор"]);

const CATEGORY_ALIASES = {
  безопасность: "mezhdunarodnaya-bezopasnost",
  политика: "politika-i-diplomatiya",
  экономика: "ekonomika-i-razvitie",
  энергетика: "energetika-i-resursy",
  экология: "ekologiya-i-klimat",
  образование: "obrazovanie-i-kultura",
  организации: "mezhdunarodnye-organizatsii",
  мероприятия: "mezhdunarodnye-meropriyatiya",
  мнения: "mneniya",
  интервью: "intervyu",
};

const REGION_ALIASES = {
  россия: "rossiya",
  европа: "evropa",
  ближний_восток: "blizhniy-vostok",
  африка: "afrika",
  латам: "latinskaya-amerika",
  латинская_америка: "latinskaya-amerika",
  кавказ: "kavkaz",
  центральная_азия: "tsentralnaya-aziya",
  южная_азия: "yuzhnaya-aziya",
  юва: "yugo-vostochnaya-aziya",
  юго_восточная_азия: "yugo-vostochnaya-aziya",
  ва_атр: "vostochnaya-aziya-i-atr",
  восточная_азия: "vostochnaya-aziya-i-atr",
  северная_америка: "severnaya-amerika",
  океания: "avstraliya-i-okeaniya",
  арктика: "arktika",
};

function resolveCategorySlug(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  return CATEGORY_ALIASES[lower] || lower;
}

function resolveRegionSlug(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  return REGION_ALIASES[lower] || lower;
}

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
 * Parse the first message of an article chain.
 * @param {string} raw
 * @returns {{
 *   ok: true,
 *   title: string,
 *   categorySlug: string | null,
 *   regionSlug: string | null,
 *   format: string | null,
 *   authorName: string | null,
 *   bodyText: string,
 * } | { ok: false, error: string }}
 */
function parseFirstMessage(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, error: "Пустое сообщение" };

  const lines = text.split(/\r?\n/);
  const title = (lines[0] || "").trim();
  if (!title) return { ok: false, error: "Первая строка (заголовок) пуста" };

  // Find the line with hashtags (usually line 2).
  const tagLineIdx = lines.findIndex((l, i) => i > 0 && /#/.test(l));
  const tagLine = tagLineIdx >= 0 ? lines[tagLineIdx] : "";
  const tags = extractHashtags(tagLine);
  const categorySlug = tags[0] ?? null;
  const regionSlug = tags[1] ?? null;
  const formatSlug = tags[2] ?? null;

  const format = formatSlug ? normalizeFormatSlug(formatSlug) : null;
  if (formatSlug && !format) {
    return {
      ok: false,
      error: `Неизвестный формат «${formatSlug}». Допустимо: анализ, мнение, интервью, колонка, обзор`,
    };
  }

  // Find author line.
  const authorIdx = lines.findIndex((l) => /^автор\s*:/i.test(l.trim()));
  const authorName =
    authorIdx >= 0
      ? lines[authorIdx].replace(/^автор\s*:\s*/i, "").trim() || null
      : null;

  let bodyStartIdx = authorIdx >= 0 ? authorIdx + 1 : Math.max(tagLineIdx + 1, 1);
  // Skip empty lines after author/hashtags
  while (bodyStartIdx < lines.length && !lines[bodyStartIdx].trim()) {
    bodyStartIdx += 1;
  }
  const bodyText = lines.slice(bodyStartIdx).join("\n").trim();

  if (!bodyText) {
    return {
      ok: false,
      error:
        "Текст статьи пуст. После строки «Автор: ...» добавьте пустую строку и первый абзац.",
    };
  }

  return {
    ok: true,
    title,
    categorySlug,
    regionSlug,
    format,
    authorName,
    bodyText,
  };
}

// v1: plain text + markdown-style headings/paragraphs. Entities will be supported later.
function telegramToHtml(text, _entities) {
  let html = String(text || "");
  // Markdown-style headings (allow leading spaces)
  html = html.replace(/(^|\n)\s*###\s+(.+?)(?=\n|$)/g, "$1<h3>$2</h3>");
  html = html.replace(/(^|\n)\s*##\s+(.+?)(?=\n|$)/g, "$1<h2>$2</h2>");
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("<h2>") || p.startsWith("<h3>")) {
        const nl = p.indexOf("\n");
        if (nl === -1) return p;
        const heading = p.slice(0, nl).trim();
        const rest = p.slice(nl + 1).trim();
        if (!rest) return heading;
        const restWithBr = rest.replace(/\n/g, "<br>");
        return `${heading}\n<p>${restWithBr}</p>`;
      }
      p = p.replace(/\n/g, "<br>");
      return `<p>${p}</p>`;
    })
    .filter(Boolean)
    .join("\n");
  return html;
}

module.exports = {
  parseFirstMessage,
  extractHashtags,
  normalizeFormatSlug,
  FORMAT_ENUM,
  telegramToHtml,
  resolveCategorySlug,
  resolveRegionSlug,
};
