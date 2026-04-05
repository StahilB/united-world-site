import type { TocHeading } from "./types";

type BlockNode = {
  type?: string;
  level?: number;
  children?: unknown[];
  format?: string;
};

function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";
  const n = node as BlockNode;
  if (n.type === "text" && typeof (n as { text?: string }).text === "string") {
    return (n as { text: string }).text;
  }
  if (Array.isArray(n.children)) {
    return n.children.map(extractText).join("");
  }
  return "";
}

let headingSeq = 0;

function makeHeadingId(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04ff-]/gi, "")
    .slice(0, 80);
  headingSeq += 1;
  return base || `section-${headingSeq}`;
}

/**
 * Renders Strapi 5 Blocks field to HTML + TOC (h2/h3 only for scroll-spy).
 */
export function strapiBlocksToHtml(blocks: unknown): {
  html: string;
  toc: TocHeading[];
} {
  headingSeq = 0;
  const toc: TocHeading[] = [];
  if (!Array.isArray(blocks)) {
    return { html: "", toc: [] };
  }

  const parts: string[] = [];

  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as BlockNode;
    const t = block.type;

    if (t === "paragraph") {
      const text = extractText(block).trim();
      if (text) {
        parts.push(`<p>${escapeHtml(text)}</p>`);
      } else {
        parts.push("<p>&nbsp;</p>");
      }
      continue;
    }

    if (t === "heading") {
      const text = extractText(block).trim();
      const lvl = typeof block.level === "number" ? block.level : 2;
      const id = makeHeadingId(text);
      /** Map Strapi levels to h2/h3 for TOC (promote h1 → h2). */
      const tag: "h2" | "h3" =
        lvl <= 1 ? "h2" : lvl === 2 ? "h2" : "h3";
      const level: 2 | 3 = tag === "h2" ? 2 : 3;
      const cls = tag === "h2" ? "article-h2" : "article-h3";
      toc.push({ id, text, level });
      parts.push(
        `<${tag} id="${escapeAttr(id)}" class="${cls}">${escapeHtml(text)}</${tag}>`,
      );
      continue;
    }

    if (t === "list") {
      const format = block.format === "ordered" ? "ol" : "ul";
      const items = Array.isArray(block.children) ? block.children : [];
      const lis = items
        .map((item) => {
          const liText = extractText(item).trim();
          return liText ? `<li>${escapeHtml(liText)}</li>` : "";
        })
        .filter(Boolean)
        .join("");
      if (lis) {
        parts.push(`<${format} class="article-list">${lis}</${format}>`);
      }
      continue;
    }

    if (t === "quote") {
      const text = extractText(block).trim();
      if (text) {
        parts.push(`<blockquote class="article-quote">${escapeHtml(text)}</blockquote>`);
      }
    }
  }

  return { html: parts.join("\n"), toc };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
