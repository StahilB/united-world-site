/**
 * Парсинг стандартного шаблона статьи из .docx.
 * FIX: расширенные алиасы, отладка, устойчивый парсинг ячеек.
 */
const mammoth = require("mammoth");
const JSZip = require("jszip");

const META_FIELD_ALIASES = {
  // Русский
  заголовок: "title", title: "title", heading: "title", headline: "title",
  автор: "author", author: "author", writer: "author", by: "author",
  рубрика: "category", категория: "category", category: "category", rubric: "category", topic: "category",
  регион: "region", region: "region", area: "region", locale: "region",
  формат: "format", format: "format", type: "format", style: "format",
  аннотация: "excerpt", описание: "excerpt", excerpt: "excerpt", annotation: "excerpt", abstract: "excerpt", summary: "excerpt",
  // С двоеточиями/пробелами (Word любит добавлять)
  "заголовок:": "title", "title:": "title", "heading:": "title",
  "автор:": "author", "author:": "author", "writer:": "author",
};

/**
 * Собирает весь текст из ячейки, склеивая разбитые <w:t> теги.
 */
function cellTextFromXml(cellXml) {
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const parts = [];
  let m;
  while ((m = re.exec(cellXml)) !== null) {
    parts.push(m[1]);
  }
  // Убираем невидимые символы Word (NBSP, zero-width, soft hyphens)
  return parts.join("")
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstTable(documentXml) {
  const tblMatch = documentXml.match(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/);
  if (!tblMatch) return null;
  const tblXml = tblMatch[0];
  const rowRe = /<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g;
  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRe.exec(tblXml)) !== null) {
    const rowXml = rowMatch[0];
    const cellRe = /<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowXml)) !== null) {
      cells.push(cellTextFromXml(cellMatch[0]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows.length > 0 ? rows : null;
}

function parseMetaTable(rows) {
  if (!rows) return null;
  const meta = { title: null, author: null, category: null, region: null, format: null, excerpt: null };
  
  console.log(`[docx] Table parsed: ${rows.length} rows`);
  
  for (const row of rows) {
    if (row.length < 2) continue;
    let key = row[0].trim().toLowerCase();
    const value = row[1].trim();
    console.log(`[docx] ROW: key="${key}", value="${value.substring(0, 50)}"`);

    let field = META_FIELD_ALIASES[key];
    // Fallback: частичное совпадение (если key="title " или "author (ru)")
    if (!field) {
      for (const [alias, target] of Object.entries(META_FIELD_ALIASES)) {
        if (key.includes(alias) || alias.includes(key)) {
          field = target;
          console.log(`[docx] Fuzzy match: "${key}" → "${target}"`);
          break;
        }
      }
    }

    if (field && value) {
      meta[field] = value;
      console.log(`[docx] ✓ Mapped: ${field} = "${value.substring(0, 40)}"`);
    }
  }

  console.log(`[docx] Final meta object:`, JSON.stringify(meta));
  return meta;
}

function normalizeSingleChoice(value) {
  if (!value) return null;
  if (value.includes("/")) return value.split("/")[0].trim().toLowerCase();
  return value.trim().toLowerCase();
}

async function convertDocxToHtml(buffer) {
  const images = [];
  let imageIndex = 0;
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Заголовок 1'] => h2:fresh",
      "p[style-name='Заголовок 2'] => h2:fresh",
      "p[style-name='Заголовок 3'] => h3:fresh",
      "p[style-name='Заголовок 4'] => h4:fresh",
      "b => strong", "i => em",
    ],
    convertImage: mammoth.images.imgElement(async (image) => {
      const contentType = image.contentType;
      const buf = await image.read();
      const idx = imageIndex++;
      images.push({ index: idx, buffer: buf, contentType });
      return { src: `__IMG_PLACEHOLDER_${idx}__` };
    }),
  };
  const { value: html, messages } = await mammoth.convertToHtml({ buffer }, options);
  return { html, images, messages };
}

function stripTemplateHeader(html) {
  const idx = html.indexOf("<table");
  if (idx === -1) return html;
  const endIdx = html.indexOf("</table>", idx);
  if (endIdx === -1) return html;
  const cutTo = endIdx + "</table>".length;
  const afterTable = html.slice(cutTo);
  const sepRe = /^\s*<p>(\s*<strong>)?([\s\S]*?)(<\/strong>\s*)?<\/p>/;
  let remainder = afterTable;
  for (let i = 0; i < 3; i++) {
    const m = remainder.match(sepRe);
    if (!m) break;
    const inner = m[2].replace(/<[^>]+>/g, "").trim();
    const isDivider = inner.length > 0 && (/^[\s\-–—_=*]+$/.test(inner) || /текст\s+статьи|text\s+of\s+the\s+article/i.test(inner) || (inner.match(/[\-–—]/g) || []).length / inner.length > 0.25);
    if (!isDivider) break;
    remainder = remainder.slice(m[0].length);
  }
  return remainder.trim();
}

async function parseDocxArticle(fileBuffer) {
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) return { ok: false, error: "Неверный формат файла — не похоже на .docx" };
    
    const documentXml = await documentXmlFile.async("string");
    const tableRows = extractFirstTable(documentXml);
    if (!tableRows) return { ok: false, error: "В документе не найдена мета-таблица." };
    
    const meta = parseMetaTable(tableRows);
    
    if (!meta || !meta.title || !meta.author) {
      console.error(`[docx] ❌ FAILED VALIDATION. title=${!!meta?.title}, author=${!!meta?.author}`);
      return { ok: false, error: "В мета-таблице не заполнены обязательные поля «Заголовок» и/или «Автор»." };
    }
    
    const { html: rawHtml, images, messages } = await convertDocxToHtml(fileBuffer);
    const bodyHtml = stripTemplateHeader(rawHtml);
    
    return {
      ok: true,
      meta: {
        title: meta.title,
        author: meta.author,
        category: normalizeSingleChoice(meta.category),
        region: normalizeSingleChoice(meta.region),
        format: normalizeSingleChoice(meta.format),
        excerpt: meta.excerpt,
      },
      bodyHtml, images,
      warnings: (messages || []).filter((m) => m.type !== "info").map((m) => m.message),
    };
  } catch (e) {
    return { ok: false, error: `Не удалось прочитать файл: ${e.message}` };
  }
}

module.exports = { parseDocxArticle, extractFirstTable, parseMetaTable, normalizeSingleChoice };