import type { Article, TocHeading } from "./types";
import { getArticlesByCategory, getArticlesByRegion } from "./api";
import { mapStrapiArticleToArticle } from "./strapi-mappers";
import { getStrapiUrl } from "./strapi-config";
import { strapiBlocksToHtml } from "./strapi-blocks-html";
import { getArticlesByCategory as mockGetByCategory, mockArticles } from "./mock-data";
import type { CSSProperties } from "react";

function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export type { TocHeading };

export type ArticleHtmlChunk =
  | { type: "html"; html: string }
  | {
      type: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
      className?: string;
      style?: CSSProperties;
      loading?: "lazy" | "eager";
      decoding?: "async" | "sync" | "auto";
    };

function extractAttr(tag: string, name: string): string | null {
  const rx = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(rx)?.[1] ?? null;
}

function toCamelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

const ALLOWED_IMG_INLINE_STYLE_KEYS = new Set([
  "width",
  "height",
  "maxWidth",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "display",
  "float",
  "aspectRatio",
  "borderRadius",
  "verticalAlign",
]);

function parseInlineStyle(raw: string | null): CSSProperties | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  raw
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const idx = rule.indexOf(":");
      if (idx <= 0) return;
      const key = toCamelCase(rule.slice(0, idx).trim());
      const value = rule.slice(idx + 1).trim();
      if (!key || !value) return;
      if (!ALLOWED_IMG_INLINE_STYLE_KEYS.has(key)) return;
      out[key] = value;
    });
  return Object.keys(out).length > 0 ? (out as CSSProperties) : undefined;
}

/**
 * Splits html into chunks where <img> tags are extracted
 * so UI can render them with next/image.
 */
export function replaceImgWithNextImage(html: string): ArticleHtmlChunk[] {
  const chunks: ArticleHtmlChunk[] = [];
  const imgTagRx = /<img\b[^>]*>/gi;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = imgTagRx.exec(html)) !== null) {
    const idx = match.index;
    const tag = match[0];
    const before = html.slice(lastIdx, idx);
    if (before.trim()) {
      chunks.push({ type: "html", html: before });
    }

    const src = extractAttr(tag, "src");
    if (src) {
      const widthRaw = Number(extractAttr(tag, "width"));
      const heightRaw = Number(extractAttr(tag, "height"));
      const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 1200;
      const height = Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : 675;
      const loading = extractAttr(tag, "loading");
      const decoding = extractAttr(tag, "decoding");
      chunks.push({
        type: "image",
        src,
        alt: extractAttr(tag, "alt") ?? "",
        width,
        height,
        className: extractAttr(tag, "class") ?? undefined,
        style: parseInlineStyle(extractAttr(tag, "style")),
        loading:
          loading === "lazy" || loading === "eager"
            ? loading
            : undefined,
        decoding:
          decoding === "async" || decoding === "sync" || decoding === "auto"
            ? decoding
            : undefined,
      });
    }

    lastIdx = idx + tag.length;
  }

  const tail = html.slice(lastIdx);
  if (tail.trim()) {
    chunks.push({ type: "html", html: tail });
  }

  return chunks;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04ff-]/gi, "")
    .slice(0, 80);
}

function escapeHtmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Добавляет id к h2/h3 без атрибута id (для якорей оглавления). */
function ensureHeadingIdsInHtml(html: string): string {
  const re = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let seq = 0;
  const usedIds = new Set<string>();
  function uniqueId(base: string): string {
    let id = base || `heading-${++seq}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
    let n = 2;
    while (usedIds.has(`${id}-${n}`)) n += 1;
    const out = `${id}-${n}`;
    usedIds.add(out);
    return out;
  }
  return html.replace(re, (_full, level: string, attrs: string, inner: string) => {
    if (/\bid\s*=/.test(attrs)) {
      const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
      if (idMatch) usedIds.add(idMatch[1]);
      return `<h${level}${attrs}>${inner}</h${level}>`;
    }
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = uniqueId(slugify(text));
    const safe = escapeHtmlAttr(id);
    return `<h${level} id="${safe}"${attrs}>${inner}</h${level}>`;
  });
}

/** h2/h3 с id или без (CKEditor часто без id — генерируем slug из текста) */
function parseHeadingsFromHtml(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const re = /<h([23])(?:[^>]*\bid="([^"]+)")?[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  let seq = 0;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]) as 2 | 3;
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    const id = m[2] || slugify(text) || `heading-${++seq}`;
    if (text) headings.push({ id, text, level });
  }
  return headings;
}

function paragraph(text: string): string {
  return `<p>${text}</p>`;
}

/**
 * Renders article body: CKEditor HTML → Blocks (legacy) → mock body → excerpt template.
 */
export function getArticleRenderedContent(
  article: Article,
  strapiBlocks?: unknown,
  contentHtml?: string | null,
): {
  html: string;
  toc: TocHeading[];
} {
  if (contentHtml && typeof contentHtml === "string" && contentHtml.trim()) {
    const htmlWithIds = ensureHeadingIdsInHtml(contentHtml);
    return {
      html: htmlWithIds,
      toc: parseHeadingsFromHtml(htmlWithIds),
    };
  }

  if (Array.isArray(strapiBlocks) && strapiBlocks.length > 0) {
    return strapiBlocksToHtml(strapiBlocks);
  }

  if (article.body) {
    return {
      html: article.body,
      toc: parseHeadingsFromHtml(article.body),
    };
  }

  const toc: TocHeading[] = [];
  const h = (level: 2 | 3, id: string, text: string) => {
    toc.push({ id, text, level });
    const Tag = level === 2 ? "h2" : "h3";
    const cls = level === 2 ? "article-h2" : "article-h3";
    return `<${Tag} id="${id}" class="${cls}">${text}</${Tag}>`;
  };

  const blocks: string[] = [];

  blocks.push(`<p class="article-lead">${article.excerpt}</p>`);

  blocks.push(
    h(2, "kontekst", "Контекст и постановка вопроса"),
  );
  blocks.push(
    paragraph(
      "Материал опирается на открытые источники, официальные заявления и аналитические оценки. Мы стремимся отделить проверяемые факты от интерпретаций и явно обозначать степень неопределённости там, где данных недостаточно.",
    ),
  );
  blocks.push(
    paragraph(
      "Ниже приведена структурированная аргументация с акцентом на практические последствия для читателя, интересующегося международной повесткой и региональной спецификой.",
    ),
  );

  blocks.push(h(2, "analiz", "Аналитический разбор"));
  blocks.push(
    paragraph(
      "Ключевые факторы включают институциональные ограничения, экономические циклы и внешнеполитические инициативы. Их сочетание формирует сценарии, которые не следует смешивать без учёта масштаба и горизонта планирования.",
    ),
  );

  blocks.push(h(3, "podrazdel-faktory", "Факторы и ограничения"));
  blocks.push(
    paragraph(
      "Сопоставление разных уровней регулирования показывает, где возможны компромиссы, а где конфликт интересов носит структурный характер. Это важно для оценки устойчивости заявленных целей.",
    ),
  );

  blocks.push(h(2, "vyvody", "Выводы"));
  blocks.push(
    paragraph(
      "В краткосрочной перспективе следует ожидать постепенных корректировок политики; в среднесрочной — возможны более резкие сдвиги, если внешние шоки изменят расстановку сил. Наблюдение за индикаторами прозрачности и подотчётности остаётся необходимым условием здравого анализа.",
    ),
  );

  return { html: blocks.join("\n"), toc };
}

/** Related articles from Strapi (same category). */
export async function fetchReadAlsoArticles(
  article: Article,
  count: number,
): Promise<Article[]> {
  const primary = article.categories[0];
  if (!primary) return [];
  const origin = getStrapiUrl();
  const res = await getArticlesByCategory(Number(primary.id), count + 8);
  return sortByDateDesc(
    res.data
      .map((a) => mapStrapiArticleToArticle(a, origin))
      .filter((a) => a.slug !== article.slug),
  ).slice(0, count);
}

/** Similar: merge category + region lists from Strapi, dedupe. */
export async function fetchSimilarArticles(
  article: Article,
  count: number,
): Promise<Article[]> {
  const origin = getStrapiUrl();
  const [catRes, regRes] = await Promise.all([
    article.categories[0]
      ? getArticlesByCategory(Number(article.categories[0].id), 24)
      : Promise.resolve({ data: [] }),
    getArticlesByRegion(Number(article.region.id), 24),
  ]);
  const merged: Article[] = [];
  const seen = new Set<string>();
  for (const a of [...catRes.data, ...regRes.data]) {
    const m = mapStrapiArticleToArticle(a, origin);
    if (m.slug === article.slug || seen.has(m.slug)) continue;
    seen.add(m.slug);
    merged.push(m);
  }
  return sortByDateDesc(merged).slice(0, count);
}

/** Mock-only helpers (local stories without CMS). */
export function getReadAlsoArticles(article: Article, count: number): Article[] {
  const primary = article.categories[0];
  if (!primary) return [];
  return sortByDateDesc(
    mockGetByCategory(primary.slug).filter((a) => a.slug !== article.slug),
  ).slice(0, count);
}

export function getSimilarArticles(article: Article, count: number): Article[] {
  const byCat = mockGetByCategory(article.categories[0]?.slug ?? "").filter(
    (a) => a.slug !== article.slug,
  );
  const byRegion = mockArticles.filter(
    (a) => a.slug !== article.slug && a.region.slug === article.region.slug,
  );
  const merged: Article[] = [];
  const seen = new Set<string>();
  for (const a of [...byCat, ...byRegion]) {
    if (!seen.has(a.slug)) {
      seen.add(a.slug);
      merged.push(a);
    }
  }
  return sortByDateDesc(merged).slice(0, count);
}

export function getArticleTags(article: Article): string[] {
  const tags = new Set<string>();
  tags.add(article.format);
  tags.add(article.region.name);
  article.categories.forEach((c) => tags.add(c.name));
  return [...tags];
}

