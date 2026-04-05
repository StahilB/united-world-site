/**
 * Transliteration (Russian → Latin), slugify, reading time estimate.
 */

const CYRILLIC_TO_LATIN = {
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

/**
 * Transliterate string to Latin lowercase, then slugify.
 * @param {string} text
 * @returns {string}
 */
function transliterate(text) {
  let out = "";
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i];
    if (CYRILLIC_TO_LATIN[ch] !== undefined) {
      out += CYRILLIC_TO_LATIN[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (ch === " " || ch === "-" || ch === "_") {
      out += "-";
    }
    // skip other chars
  }
  return out;
}

/**
 * URL-safe slug from title.
 * @param {string} title
 * @returns {string}
 */
function slugFromTitle(title) {
  const raw = transliterate(title.trim());
  return raw
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96) || "article";
}

/**
 * Word count for Cyrillic/Latin text.
 * @param {string} text
 * @returns {number}
 */
function wordCount(text) {
  if (!text || typeof text !== "string") return 0;
  const matches = text.trim().match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

/**
 * Reading time in minutes (words / 200, min 1).
 * @param {string} text
 * @returns {number}
 */
function readingTimeMinutes(text) {
  const n = wordCount(text);
  return Math.max(1, Math.ceil(n / 200));
}

module.exports = {
  transliterate,
  slugFromTitle,
  wordCount,
  readingTimeMinutes,
};
