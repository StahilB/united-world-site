import type {
  StrapiArticle,
  StrapiAuthor,
  StrapiCategory,
  StrapiCollectionResponse,
  StrapiRegion,
  StrapiSection,
  StrapiSingleResponse,
  StrapiStaticPage,
} from "@/lib/strapi-types";

type SourceStrategy = "site" | "web" | "site+web" | "none";

type SiteItem = {
  title: string;
  url?: string;
  publishedAt?: string;
  author?: string;
  region?: string;
  categories?: string[];
  sections?: string[];
  excerpt?: string;
};

function strapiBaseUrl(): string {
  return (process.env.STRAPI_URL || "http://strapi:1337").replace(/\/$/, "");
}

function publicSiteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function mascotStrapiHeaders(): HeadersInit {
  const token = process.env.MASCOT_STRAPI_TOKEN?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function strapiRead<T>(path: string): Promise<T> {
  const token = process.env.MASCOT_STRAPI_TOKEN?.trim();
  if (!token) {
    throw new Error("MASCOT_STRAPI_TOKEN is not configured");
  }
  const res = await fetch(`${strapiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: mascotStrapiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi read failed ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function articleToSiteItem(a: StrapiArticle): SiteItem {
  return {
    title: a.title,
    url: publicSiteUrl(`/articles/${a.slug}`),
    publishedAt: a.publication_date || a.publishedAt || a.createdAt,
    author: a.author?.name,
    region: a.region?.name,
    categories: a.categories?.map((c) => c.name) ?? [],
    sections: a.sections?.map((s) => s.name) ?? [],
    excerpt: a.excerpt || undefined,
  };
}

function appendArticlePopulate(search: URLSearchParams) {
  search.set("populate[author][fields][0]", "name");
  search.set("populate[categories][fields][0]", "name");
  search.set("populate[region][fields][0]", "name");
  search.set("populate[sections][fields][0]", "name");
}

export async function getLatestSiteContent(limit = 5): Promise<SiteItem[]> {
  const search = new URLSearchParams();
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

export async function searchSiteContent(query: string, limit = 6): Promise<SiteItem[]> {
  const q = query.trim();
  if (!q) return [];
  const search = new URLSearchParams();
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  search.set("sort[0]", "publication_date:desc");
  search.set("filters[$or][0][title][$containsi]", q);
  search.set("filters[$or][1][excerpt][$containsi]", q);
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

async function getRegionSlugByName(query: string): Promise<string | null> {
  const search = new URLSearchParams();
  search.set("pagination[pageSize]", "100");
  const regions = await strapiRead<StrapiCollectionResponse<StrapiRegion>>(
    `/api/regions?${search.toString()}`,
  );
  const q = query.toLowerCase();
  const hit = (regions.data ?? []).find((r) => q.includes(r.name.toLowerCase()));
  return hit?.slug ?? null;
}

async function getCategorySlugByName(query: string): Promise<string | null> {
  const categories = await strapiRead<StrapiCollectionResponse<StrapiCategory>>("/api/categories");
  const q = query.toLowerCase();
  const hit = (categories.data ?? []).find((c) => q.includes(c.name.toLowerCase()));
  return hit?.slug ?? null;
}

async function getAuthorSlugByName(query: string): Promise<string | null> {
  const search = new URLSearchParams();
  search.set("pagination[pageSize]", "100");
  const authors = await strapiRead<StrapiCollectionResponse<StrapiAuthor>>(
    `/api/authors?${search.toString()}`,
  );
  const q = query.toLowerCase();
  const hit = (authors.data ?? []).find((a) => q.includes(a.name.toLowerCase()));
  return hit?.slug ?? null;
}

export async function getSiteContentByRegion(region: string, limit = 5): Promise<SiteItem[]> {
  const regionSlug = await getRegionSlugByName(region);
  if (!regionSlug) return [];
  const search = new URLSearchParams();
  search.set("filters[region][slug][$eq]", regionSlug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

export async function getSiteContentByCategory(
  category: string,
  limit = 5,
): Promise<SiteItem[]> {
  const slug = await getCategorySlugByName(category);
  if (!slug) return [];
  const search = new URLSearchParams();
  search.set("filters[categories][slug][$eq]", slug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

export async function getSiteContentBySection(section: string, limit = 5): Promise<SiteItem[]> {
  const sections = await strapiRead<StrapiCollectionResponse<StrapiSection>>(
    "/api/sections?pagination[page]=1&pagination[pageSize]=100",
  );
  const q = section.toLowerCase();
  const hit = (sections.data ?? []).find(
    (s) => q.includes(s.name.toLowerCase()) || q.includes(s.slug.toLowerCase()),
  );
  if (!hit) return [];
  const search = new URLSearchParams();
  search.set("filters[sections][slug][$eq]", hit.slug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

export async function getSiteContentByAuthor(author: string, limit = 5): Promise<SiteItem[]> {
  const slug = await getAuthorSlugByName(author);
  if (!slug) return [];
  const search = new URLSearchParams();
  search.set("filters[author][slug][$eq]", slug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit));
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(
    `/api/articles?${search.toString()}`,
  );
  return (res.data ?? []).map(articleToSiteItem);
}

async function getSectionsOverview(limit = 12): Promise<string[]> {
  const sections = await strapiRead<StrapiCollectionResponse<StrapiSection>>(
    "/api/sections?sort[0]=order:asc&pagination[page]=1&pagination[pageSize]=100",
  );
  return (sections.data ?? [])
    .map((s) => `${s.name} (${publicSiteUrl(`/section/${s.slug}`)})`)
    .slice(0, limit);
}

async function getAuthorsOverview(limit = 12): Promise<string[]> {
  const authors = await strapiRead<StrapiCollectionResponse<StrapiAuthor>>(
    "/api/authors?pagination[page]=1&pagination[pageSize]=100",
  );
  return (authors.data ?? [])
    .map((a) => `${a.name}${a.slug ? ` (${publicSiteUrl(`/author/${a.slug}`)})` : ""}`)
    .slice(0, limit);
}

async function getStaticPagesOverview(): Promise<string[]> {
  const staticPage = await strapiRead<StrapiSingleResponse<StrapiStaticPage>>(
    "/api/static-page?fields[0]=about_html&fields[1]=cooperation_html&fields[2]=contacts_html",
  );
  const d = staticPage.data;
  if (!d) return [];
  const out: string[] = [];
  if (d.about_html) out.push(`Об организации: ${publicSiteUrl("/about")}`);
  if (d.cooperation_html) out.push(`Сотрудничество: ${publicSiteUrl("/cooperation")}`);
  if (d.contacts_html) out.push(`Контакты: ${publicSiteUrl("/contacts")}`);
  return out;
}

function isSiteQuestion(text: string): boolean {
  return /(на сайте|материал|стать|автор|раздел|рубрик|категор|поиск|опублик|последн|кто автор)/i.test(
    text,
  );
}

function isWebQuestion(text: string): boolean {
  return /(сегодня|сейчас|новост|последни[ех]|за неделю|актуальн|в мире|что произошло|developments)/i.test(
    text,
  );
}

function isBothQuestion(text: string): boolean {
  return /(сравни|сопостав|вместе|и что в мире|и последние события)/i.test(text);
}

export function resolveMascotSources(userMessage: string): SourceStrategy {
  const text = userMessage.toLowerCase();
  if (isBothQuestion(text)) return "site+web";
  if (isSiteQuestion(text) && isWebQuestion(text)) return "site+web";
  if (isSiteQuestion(text)) return "site";
  if (isWebQuestion(text)) return "web";
  if (/(что такое|объясни|термин|definition|понятие)/i.test(text)) return "none";
  return "none";
}

async function getWebContext(query: string, limit = 5): Promise<string[]> {
  const search = new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    no_redirect: "1",
    skip_disambig: "1",
  });
  const res = await fetch(`https://api.duckduckgo.com/?${search.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`DuckDuckGo ${res.status}`);
  }
  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
  };
  const out: string[] = [];
  if (data.AbstractText) {
    out.push(`${data.AbstractText}${data.AbstractURL ? ` (${data.AbstractURL})` : ""}`);
  }
  for (const t of data.RelatedTopics ?? []) {
    if ("Topics" in t && Array.isArray(t.Topics)) {
      for (const nested of t.Topics) {
        if (nested.Text) out.push(`${nested.Text}${nested.FirstURL ? ` (${nested.FirstURL})` : ""}`);
      }
    } else if ("Text" in t && t.Text) {
      out.push(`${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`);
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

function formatSiteContext(items: SiteItem[]): string {
  if (items.length === 0) return "Ничего релевантного не найдено.";
  return items
    .map((it, i) => {
      const bits = [
        `${i + 1}. ${it.title}`,
        it.publishedAt ? `дата: ${it.publishedAt}` : null,
        it.author ? `автор: ${it.author}` : null,
        it.region ? `регион: ${it.region}` : null,
        it.categories?.length ? `темы: ${it.categories.join(", ")}` : null,
        it.sections?.length ? `разделы: ${it.sections.join(", ")}` : null,
        it.url ? `url: ${it.url}` : null,
        it.excerpt ? `кратко: ${it.excerpt.slice(0, 220)}` : null,
      ].filter(Boolean);
      return bits.join(" | ");
    })
    .join("\n");
}

export async function getRelevantSiteContext(userMessage: string): Promise<string> {
  const lower = userMessage.toLowerCase();
  const collected: SiteItem[] = [];

  if (/последн|свеж|новы/.test(lower)) {
    collected.push(...(await getLatestSiteContent(5)));
  }
  if (/раздел/.test(lower)) {
    const sections = await getSectionsOverview(12);
    return `Разделы сайта:\n${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }
  if (/автор/.test(lower) && /(кто|последн)/.test(lower)) {
    const latest = await getLatestSiteContent(1);
    if (latest[0]) {
      return `Последний материал: ${latest[0].title}. Автор: ${latest[0].author || "не указан"}. URL: ${
        latest[0].url || "-"
      }`;
    }
  }
  if (/какие авторы|авторы публику/.test(lower)) {
    const authors = await getAuthorsOverview(15);
    return `Авторы на сайте:\n${authors.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
  }

  const byRegion = await getSiteContentByRegion(userMessage, 5);
  const byCategory = await getSiteContentByCategory(userMessage, 5);
  const bySection = await getSiteContentBySection(userMessage, 5);
  const byAuthor = await getSiteContentByAuthor(userMessage, 5);
  const searched = await searchSiteContent(userMessage, 6);

  collected.push(...byRegion, ...byCategory, ...bySection, ...byAuthor, ...searched);
  const uniq = Array.from(new Map(collected.map((x) => [x.url || x.title, x])).values()).slice(0, 8);

  const staticOverview = await getStaticPagesOverview();
  const staticBlock =
    staticOverview.length > 0
      ? `\nСтатические страницы:\n${staticOverview.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : "";

  return `${formatSiteContext(uniq)}${staticBlock}`;
}

export async function buildMascotRetrievalContext(userMessage: string): Promise<{
  strategy: SourceStrategy;
  contextText: string;
}> {
  const strategy = resolveMascotSources(userMessage);
  let siteContext = "";
  let webContext = "";

  if (strategy === "site" || strategy === "site+web") {
    try {
      siteContext = await getRelevantSiteContext(userMessage);
    } catch (e) {
      console.error(
        `[mascot] ${JSON.stringify({
          provider: "retrieval",
          phase: "site_context",
          message: e instanceof Error ? e.message : String(e),
        })}`,
      );
    }
  }

  if (strategy === "web" || strategy === "site+web") {
    try {
      const web = await getWebContext(userMessage, 5);
      webContext = web.length
        ? web.map((row, i) => `${i + 1}. ${row}`).join("\n")
        : "Ничего релевантного не найдено.";
    } catch (e) {
      console.error(
        `[mascot] ${JSON.stringify({
          provider: "retrieval",
          phase: "web_context",
          message: e instanceof Error ? e.message : String(e),
        })}`,
      );
    }
  }

  const blocks: string[] = [];
  if (siteContext) blocks.push(`SITE_CONTEXT:\n${siteContext}`);
  if (webContext) blocks.push(`WEB_CONTEXT:\n${webContext}`);

  if (blocks.length === 0) {
    return { strategy, contextText: "" };
  }

  blocks.push(
    "INSTRUCTIONS_FOR_MODEL: используй данные из блоков выше как первоисточник; не выдумывай факты; если данных не хватает — скажи об этом явно; для вопросов о сайте приоритет у SITE_CONTEXT.",
  );

  return { strategy, contextText: blocks.join("\n\n") };
}

