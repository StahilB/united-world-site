import type { Article } from "./types";
import {
  getArticleBySlug,
  getArticlesByCategory,
  mockArticles,
} from "./mock-data";

function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

/** Парсинг h2/h3 с id из HTML (если body задан вручную) */
function parseHeadingsFromHtml(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const re = /<h([23])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]) as 2 | 3;
    const id = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    if (id && text) headings.push({ id, text, level });
  }
  return headings;
}

function paragraph(text: string): string {
  return `<p>${text}</p>`;
}

/** Текст статьи по умолчанию: оглавление + типографика */
export function getArticleRenderedContent(article: Article): {
  html: string;
  toc: TocHeading[];
} {
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

export function getReadAlsoArticles(article: Article, count: number): Article[] {
  const primary = article.categories[0];
  if (!primary) return [];
  return sortByDateDesc(
    getArticlesByCategory(primary.slug).filter((a) => a.slug !== article.slug),
  ).slice(0, count);
}

export function getSimilarArticles(article: Article, count: number): Article[] {
  const byCat = getArticlesByCategory(article.categories[0]?.slug ?? "").filter(
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

export function resolveArticle(slug: string): Article | undefined {
  return getArticleBySlug(slug);
}
