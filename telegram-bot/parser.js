/**
 * Parse Telegram channel messages.
 * Production version: Full English/Russian aliases support.
 */
const FORMAT_ENUM = new Set(["анализ", "мнение", "интервью", "колонка", "обзор"]);

const CATEGORY_ALIASES = {
  // Russian
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
  // English
  organizations: "mezhdunarodnye-organizatsii",
  security: "mezhdunarodnaya-bezopasnost",
  politics: "politika-i-diplomatiya",
  economy: "ekonomika-i-razvitie",
  energy: "energetika-i-resursy",
  ecology: "ekologiya-i-klimat",
  education: "obrazovanie-i-kultura",
  events: "mezhdunarodnye-meropriyatiya",
};

const REGION_ALIASES = {
  // Russian
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
  // English
  russia: "rossiya",
  europe: "evropa",
  middle_east: "blizhniy-vostok",
  africa: "afrika",
  latam: "latinskaya-amerika",
  latin_america: "latinskaya-amerika",
  caucasus: "kavkaz",
  central_asia: "tsentralnaya-aziya",
  south_asia: "yuzhnaya-aziya",
  sea: "yugo-vostochnaya-aziya",
  ea_apr: "vostochnaya-aziya-i-atr",
  east_asia: "vostochnaya-aziya-i-atr",
  north_america: "severnaya-amerika",
  oceania: "avstraliya-i-okeaniya",
  arctic: "arktika",
};

const FORMAT_MAP = {
  // Russian
  анализ: "анализ", мнение: "мнение", интервью: "интервью", колонка: "колонка", обзор: "обзор",
  // English
  analysis: "анализ", opinion: "мнение", interview: "интервью", column: "колонка", review: "обзор",
};

function resolveCategorySlug(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower;
}

function resolveRegionSlug(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase().trim();
  return REGION_ALIASES[lower] || lower;
}

function normalizeFormatSlug(slug) {
  if (!slug) return null;
  const s = slug.toLowerCase().trim();
  if (FORMAT_MAP[s]) return FORMAT_MAP[s];
  if (FORMAT_ENUM.has(s)) return s;
  return null;
}

function extractHashtags(line) {
  const re = /#([\w\u0400-\u04FF_]+)/gu;
  const out = []; let m;
  while ((m = re.exec(line)) !== null) out.push(m[1].toLowerCase());
  return out;
}

function parseFirstMessage(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, error: "Пустое сообщение" };
  const lines = text.split(/\r?\n/);
  const title = (lines[0] || "").trim();
  if (!title) return { ok: false, error: "Первая строка (заголовок) пуста" };

  const tagLineIdx = lines.findIndex((l, i) => i > 0 && /#/.test(l));
  const tagLine = tagLineIdx >= 0 ? lines[tagLineIdx] : "";
  const tags = extractHashtags(tagLine);
  
  const categorySlug = tags[0] ? resolveCategorySlug(tags[0]) : null;
  const regionSlug = tags[1] ? resolveRegionSlug(tags[1]) : null;
  const formatSlug = tags[2] ? normalizeFormatSlug(tags[2]) : null;
  
  if (tags[2] && !formatSlug) return { ok: false, error: `Неизвестный формат «${tags[2]}». Допустимо: анализ, мнение, интервью, колонка, обзор` };

  const authorIdx = lines.findIndex((l) => /^автор\s*:/i.test(l.trim()));
  const authorName = authorIdx >= 0 ? lines[authorIdx].replace(/^автор\s*:\s*/i, "").trim() || null : null;

  let cursorIdx = authorIdx >= 0 ? authorIdx + 1 : Math.max(tagLineIdx + 1, 1);
  while (cursorIdx < lines.length && !lines[cursorIdx].trim()) cursorIdx += 1;

  let excerpt = null;
  const excerptMarker = /^(аннотация|excerpt|описание)\s*:\s*(.*)$/i;
  if (cursorIdx < lines.length && excerptMarker.test(lines[cursorIdx].trim())) {
    const firstMatch = lines[cursorIdx].trim().match(excerptMarker);
    const firstLineTail = firstMatch && firstMatch[2] ? firstMatch[2].trim() : "";
    const excerptLines = firstLineTail ? [firstLineTail] : [];
    cursorIdx += 1;
    while (cursorIdx < lines.length && lines[cursorIdx].trim()) { excerptLines.push(lines[cursorIdx].trim()); cursorIdx += 1; }
    excerpt = excerptLines.join(" ").trim() || null;
    while (cursorIdx < lines.length && !lines[cursorIdx].trim()) cursorIdx += 1;
  }

  const bodyText = lines.slice(cursorIdx).join("\n").trim();
  if (!bodyText) return { ok: false, error: "Текст статьи пуст." };
  return { ok: true, title, categorySlug, regionSlug, format: formatSlug, authorName, excerpt, bodyText };
}

function telegramToHtml(text, _entities) {
  let html = String(text || "");
  html = html.replace(/(^|\n)\s*###\s+(.+?)(?=\n|$)/g, "$1<h3>$2</h3>");
  html = html.replace(/(^|\n)\s*##\s+(.+?)(?=\n|$)/g, "$1<h2>$2</h2>");
  const paragraphs = html.split(/\n+/);
  html = paragraphs.map((p) => {
    p = p.trim(); if (!p) return "";
    if (p.startsWith("<h2>") || p.startsWith("<h3>")) {
      const nl = p.indexOf("\n");
      if (nl === -1) return p;
      const heading = p.slice(0, nl).trim();
      const rest = p.slice(nl + 1).trim();
      return rest ? `${heading}\n<p>${rest.replace(/\n/g, "<br>")}</p>` : heading;
    }
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");
  return html;
}

module.exports = {
  parseFirstMessage, extractHashtags, normalizeFormatSlug, FORMAT_ENUM,
  telegramToHtml, resolveCategorySlug, resolveRegionSlug,
};