/**
 * Парсинг стандартного шаблона статьи из .docx.
 *
 * Структура шаблона (см. Шаблон_статьи_АНО_Единый_Мир.docx):
 * 1. Заголовочные параграфы (игнорируются — "ШАБЛОН СТАТЬИ" и инструкции).
 * 2. ОДНА таблица 6×2 с мета-полями (ключ / значение).
 * 3. Тело статьи — параграфы после таблицы.
 *    - Стили Heading 1/2/3 → заголовки h2/h3/h4
 *    - Bold/italic runs → <strong>/<em>
 *    - Изображения → base64, вынимаются отдельно
 */

const mammoth = require("mammoth");
const JSZip = require("jszip");

const META_FIELD_ALIASES = {
  заголовок: "title",
  title: "title",
  автор: "author",
  author: "author",
  рубрика: "category",
  категория: "category",
  category: "category",
  регион: "region",
  region: "region",
  формат: "format",
  format: "format",
  аннотация: "excerpt",
  описание: "excerpt",
  excerpt: "excerpt",
};

/**
 * Вытягивает XML-текст содержимого ячейки (без форматирования, просто текст).
 */
function cellTextFromXml(cellXml) {
  // <w:tc> → <w:p>... → <w:r>... → <w:t>...</w:t>
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const parts = [];
  let m;
  while ((m = re.exec(cellXml)) !== null) {
    parts.push(m[1]);
  }
  return parts.join("").trim();
}

/**
 * Находит первую таблицу в document.xml и возвращает её ячейки.
 * @returns {string[][] | null} матрица текстов ячеек или null если таблицы нет
 */
function extractFirstTable(documentXml) {
  // Ищем первую <w:tbl>...</w:tbl>
  const tblMatch = documentXml.match(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/);
  if (!tblMatch) return null;
  const tblXml = tblMatch[0];

  // Для каждого <w:tr> получаем массив текстов ячеек.
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

/**
 * Извлекает мета-поля из первой таблицы.
 * @returns {{ title, author, category, region, format, excerpt } | null}
 */
function parseMetaTable(rows) {
  if (!rows) return null;
  const meta = {
    title: null,
    author: null,
    category: null,
    region: null,
    format: null,
    excerpt: null,
  };
  for (const row of rows) {
    if (row.length < 2) continue;
    const key = row[0].trim().toLowerCase();
    const value = row[1].trim();
    const field = META_FIELD_ALIASES[key];
    if (field && value) {
      meta[field] = value;
    }
  }
  return meta;
}

/**
 * Нормализация. Рубрика и регион в шаблоне могут прилететь в виде списка
 * "политика / экономика / энергетика ...". Если так — значит автор
 * забыл удалить лишние варианты. Берём первое слово до " / ".
 *
 * Формат: из "анализ / мнение / интервью" → "анализ".
 */
function normalizeSingleChoice(value) {
  if (!value) return null;
  // Если видим " / " — взять только первое слово.
  if (value.includes("/")) {
    return value.split("/")[0].trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

/**
 * Конвертирует docx в HTML через mammoth.
 * Возвращает:
 * - html: строка HTML тела
 * - images: массив {index, buffer, contentType, originalName}
 *   в порядке встречи в документе
 */
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
      "b => strong",
      "i => em",
    ],
    convertImage: mammoth.images.imgElement(async (image) => {
      const contentType = image.contentType;
      const buf = await image.read();
      const idx = imageIndex++;
      images.push({
        index: idx,
        buffer: buf,
        contentType,
      });
      // Ставим плейсхолдер, который потом заменим на настоящий URL.
      return { src: `__IMG_PLACEHOLDER_${idx}__` };
    }),
  };

  const { value: html, messages } = await mammoth.convertToHtml(
    { buffer },
    options,
  );
  return { html, images, messages };
}

/**
 * Удаляет первую <table> из HTML (мета-таблица — в html через mammoth
 * тоже попадает; мы её оттуда выкидываем, потому что данные уже разобраны).
 */
function stripFirstTable(html) {
  const idx = html.indexOf("<table");
  if (idx === -1) return html;
  const endIdx = html.indexOf("</table>", idx);
  if (endIdx === -1) return html;
  const cutTo = endIdx + "</table>".length;
  return (html.slice(0, idx) + html.slice(cutTo)).trim();
}

/**
 * Главная функция.
 * @param {Buffer} fileBuffer — бинарный .docx
 * @returns {Promise<{ok, meta?, bodyHtml?, images?, error?}>}
 */
async function parseDocxArticle(fileBuffer) {
  try {
    // 1. Достаём document.xml из zip — для парсинга таблицы
    const zip = await JSZip.loadAsync(fileBuffer);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      return { ok: false, error: "Неверный формат файла — не похоже на .docx" };
    }
    const documentXml = await documentXmlFile.async("string");

    // 2. Мета-таблица
    const tableRows = extractFirstTable(documentXml);
    if (!tableRows) {
      return {
        ok: false,
        error:
          "В документе не найдена мета-таблица. Используйте стандартный шаблон (Шаблон_статьи_АНО_Единый_Мир.docx).",
      };
    }
    const meta = parseMetaTable(tableRows);
    if (!meta || !meta.title || !meta.author) {
      return {
        ok: false,
        error:
          "В мета-таблице не заполнены обязательные поля «Заголовок» и/или «Автор».",
      };
    }

    // 3. Тело + изображения через mammoth
    const { html: rawHtml, images, messages } = await convertDocxToHtml(
      fileBuffer,
    );
    const bodyHtml = stripFirstTable(rawHtml);

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
      bodyHtml,
      images,
      warnings: (messages || [])
        .filter((m) => m.type !== "info")
        .map((m) => m.message),
    };
  } catch (e) {
    return {
      ok: false,
      error: `Не удалось прочитать файл: ${e.message}`,
    };
  }
}

module.exports = {
  parseDocxArticle,
  extractFirstTable,
  parseMetaTable,
  normalizeSingleChoice,
};
