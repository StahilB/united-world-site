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
  slug?: string;
  url?: string;
  publishedAt?: string;
  author?: string;
  region?: string;
  categories?: string[];
  sections?: string[];
  excerpt?: string;
};

const CACHE_TTL_MS = Number.parseInt(process.env.MASCOT_CACHE_TTL_MS || "600000", 10);
const MAX_CACHE_KEYS = 100;
const searchCache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheGet<T>(key: string): T | null {
  const item = searchCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return item.data as T;
}

function cacheSet(key: string, data: unknown): void {
  if (searchCache.size >= MAX_CACHE_KEYS) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of searchCache) {
    if (val.expiresAt < now) searchCache.delete(key);
  }
}, 60_000);

const FETCH_TIMEOUT_MS = Number.parseInt(process.env.MASCOT_SEARCH_TIMEOUT_MS || "8000", 10);

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function strapiBaseUrl(): string {
  return (process.env.STRAPI_URL || "http://strapi:1337").replace(/\/$/, "");
}

function publicSiteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function mascotStrapiHeaders(): HeadersInit {
  const token = process.env.MASCOT_STRAPI_TOKEN?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function strapiRead<T>(path: string): Promise<T> {
  const token = process.env.MASCOT_STRAPI_TOKEN?.trim();
  if (!token) {
    console.error(`[mascot:retrieval] MASCOT_STRAPI_TOKEN is NOT SET`);
    throw new Error("MASCOT_STRAPI_TOKEN is not configured");
  }

  const url = `${strapiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  console.log(`[mascot:retrieval] Strapi request: ${url}`);

  const res = await fetchWithTimeout(url, {
    headers: mascotStrapiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[mascot:retrieval] Strapi error ${res.status}: ${text.slice(0, 300)}`);
    throw new Error(`Strapi read failed ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// FIX: Возвращаем null, если slug отсутствует — такие статьи нельзя показывать
function articleToSiteItem(a: any): SiteItem | null {
  const slug = a?.slug;
  if (!slug) {
    console.log(`[mascot:retrieval] Skipping article without slug: "${a?.title}"`);
    return null;
  }
  return {
    title: a?.title || "Без заголовка",
    slug,
    url: publicSiteUrl(`/articles/${slug}`),
    publishedAt: a?.publication_date || a?.publishedAt || a?.createdAt,
    author: a?.author?.name,
    region: a?.region?.name,
    categories: a?.categories?.map((c: any) => c?.name)?.filter(Boolean) || [],
    sections: a?.sections?.map((s: any) => s?.name)?.filter(Boolean) || [],
    excerpt: a?.excerpt,
  };
}

function appendArticlePopulate(search: URLSearchParams) {
  search.set("populate", "*");
  search.append("fields", "slug");
  search.append("fields", "title");
  search.append("fields", "excerpt");
  search.append("fields", "publishedAt");
  search.append("fields", "publication_date");
  search.append("fields", "createdAt");
}

// FIX: Общий фильтр — только опубликованные статьи
function appendPublishedFilter(search: URLSearchParams) {
  search.set("filters[$or][0][publication_date][$notNull]", "true");
  search.set("filters[$or][1][publishedAt][$notNull]", "true");
}

export async function getLatestSiteContent(limit = 5): Promise<SiteItem[]> {
  const cacheKey = `site:latest:${limit}`;
  const cached = cacheGet<SiteItem[]>(cacheKey);
  if (cached) {
    console.log(`[mascot:retrieval] Cache HIT: latest ${cached.length} articles`);
    return cached;
  }

  const search = new URLSearchParams();
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit * 2)); // Берём больше на случай отсева без slug
  appendPublishedFilter(search);
  appendArticlePopulate(search);

  console.log(`[mascot:retrieval] Fetching latest ${limit} articles...`);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search.toString()}`);
  
  // FIX: Фильтруем null (статьи без slug)
  const result = (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);

  console.log(`[mascot:retrieval] Found ${result.length} published articles:`);
  result.forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.title}" → ${item.url}`);
  });

  cacheSet(cacheKey, result);
  return result;
}

export async function searchSiteContent(query: string, limit = 6): Promise<SiteItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const cacheKey = `site:search:${q}:${limit}`;
  const cached = cacheGet<SiteItem[]>(cacheKey);
  if (cached) return cached;

  const search = new URLSearchParams();
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit * 2));
  search.set("sort[0]", "publication_date:desc");
  search.set("filters[$or][0][title][$containsi]", query);
  search.set("filters[$or][1][excerpt][$containsi]", query);
  appendPublishedFilter(search);
  appendArticlePopulate(search);

  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search.toString()}`);
  const result = (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);
  
  console.log(`[mascot:retrieval] Search "${q}" → ${result.length} articles`);
  cacheSet(cacheKey, result);
  return result;
}

async function getRegionSlugByName(query: string): Promise<string | null> {
  const cacheKey = `region:slug:${query.toLowerCase()}`;
  const cached = cacheGet<string>(cacheKey);
  if (cached) return cached;

  const search = new URLSearchParams();
  search.set("pagination[pageSize]", "100");
  search.append("fields", "slug");
  search.append("fields", "name");
  const regions = await strapiRead<StrapiCollectionResponse<StrapiRegion>>(`/api/regions?${search.toString()}`);
  
  const q = query.toLowerCase().trim();
  const hit = (regions.data ?? []).find((r) => {
    const name = r.name?.toLowerCase()?.trim();
    return name === q || name?.includes(q) || q.includes(name || "");
  });
  
  if (hit?.slug) {
    cacheSet(cacheKey, hit.slug);
    return hit.slug;
  }
  return null;
}

async function getCategorySlugByName(query: string): Promise<string | null> {
  const search = new URLSearchParams();
  search.append("fields", "slug");
  search.append("fields", "name");
  const categories = await strapiRead<StrapiCollectionResponse<StrapiCategory>>("/api/categories");
  const q = query.toLowerCase();
  const hit = (categories.data ?? []).find((c) => q.includes(c.name.toLowerCase()));
  return hit?.slug ?? null;
}

async function getAuthorSlugByName(query: string): Promise<string | null> {
  const search = new URLSearchParams();
  search.set("pagination[pageSize]", "100");
  search.append("fields", "slug");
  search.append("fields", "name");
  const authors = await strapiRead<StrapiCollectionResponse<StrapiAuthor>>(`/api/authors?${search.toString()}`);
  const q = query.toLowerCase();
  const hit = (authors.data ?? []).find((a) => q.includes(a.name.toLowerCase()));
  return hit?.slug ?? null;
}

export async function getSiteContentByRegion(region: string, limit = 5): Promise<SiteItem[]> {
  const cacheKey = `site:region:${region.toLowerCase()}:${limit}`;
  const cached = cacheGet<SiteItem[]>(cacheKey);
  if (cached) return cached;

  const search = new URLSearchParams();
  search.set("filters[region][name][$eq]", region);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit * 2));
  appendPublishedFilter(search);
  appendArticlePopulate(search);
  
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search.toString()}`);
  let result = (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);
  
  if (result.length === 0) {
    const regionSlug = await getRegionSlugByName(region);
    if (regionSlug) {
      const search2 = new URLSearchParams();
      search2.set("filters[region][slug][$eq]", regionSlug);
      search2.set("sort[0]", "publication_date:desc");
      search2.set("pagination[page]", "1");
      search2.set("pagination[pageSize]", String(limit * 2));
      appendPublishedFilter(search2);
      appendArticlePopulate(search2);
      const res2 = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search2.toString()}`);
      result = (res2.data ?? [])
        .map(articleToSiteItem)
        .filter((x): x is SiteItem => x !== null && !!x.url)
        .slice(0, limit);
    }
  }
  
  console.log(`[mascot:retrieval] Region "${region}" → ${result.length} articles`);
  cacheSet(cacheKey, result);
  return result;
}

export async function getSiteContentByCategory(category: string, limit = 5): Promise<SiteItem[]> {
  const slug = await getCategorySlugByName(category);
  if (!slug) return [];
  const search = new URLSearchParams();
  search.set("filters[categories][slug][$eq]", slug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit * 2));
  appendPublishedFilter(search);
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search.toString()}`);
  return (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);
}

export async function getSiteContentBySection(section: string, limit = 5): Promise<SiteItem[]> {
  const search = new URLSearchParams();
  search.append("fields", "slug");
  search.append("fields", "name");
  const sections = await strapiRead<StrapiCollectionResponse<StrapiSection>>(
    "/api/sections?pagination[page]=1&pagination[pageSize]=100",
  );
  const q = section.toLowerCase();
  const hit = (sections.data ?? []).find((s) => q.includes(s.name.toLowerCase()) || q.includes(s.slug.toLowerCase()));
  if (!hit) return [];
  const search2 = new URLSearchParams();
  search2.set("filters[sections][slug][$eq]", hit.slug);
  search2.set("sort[0]", "publication_date:desc");
  search2.set("pagination[page]", "1");
  search2.set("pagination[pageSize]", String(limit * 2));
  appendPublishedFilter(search2);
  appendArticlePopulate(search2);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search2.toString()}`);
  return (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);
}

export async function getSiteContentByAuthor(author: string, limit = 5): Promise<SiteItem[]> {
  const slug = await getAuthorSlugByName(author);
  if (!slug) return [];
  const search = new URLSearchParams();
  search.set("filters[author][slug][$eq]", slug);
  search.set("sort[0]", "publication_date:desc");
  search.set("pagination[page]", "1");
  search.set("pagination[pageSize]", String(limit * 2));
  appendPublishedFilter(search);
  appendArticlePopulate(search);
  const res = await strapiRead<StrapiCollectionResponse<StrapiArticle>>(`/api/articles?${search.toString()}`);
  return (res.data ?? [])
    .map(articleToSiteItem)
    .filter((x): x is SiteItem => x !== null && !!x.url)
    .slice(0, limit);
}

async function getSectionsOverview(limit = 12): Promise<string[]> {
  const search = new URLSearchParams();
  search.append("fields", "slug");
  search.append("fields", "name");
  search.append("fields", "order");
  const sections = await strapiRead<StrapiCollectionResponse<StrapiSection>>(
    "/api/sections?sort[0]=order:asc&pagination[page]=1&pagination[pageSize]=100",
  );
  return (sections.data ?? [])
    .map((s) => `${s.name} (${publicSiteUrl(`/section/${s.slug}`)})`)
    .slice(0, limit);
}

async function getAuthorsOverview(limit = 12): Promise<string[]> {
  const search = new URLSearchParams();
  search.append("fields", "slug");
  search.append("fields", "name");
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

export async function getRelevantSiteContext(userMessage: string): Promise<string> {
  const lower = userMessage.toLowerCase();

  // FIX: Быстрый путь для запросов о разделах/авторах
  if (/раздел/.test(lower)) {
    const sections = await getSectionsOverview(12);
    return `Разделы сайта:\n${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }
  if (/какие авторы|авторы публику/.test(lower)) {
    const authors = await getAuthorsOverview(15);
    return `Авторы на сайте:\n${authors.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
  }

  // FIX: Приоритет для запросов "последние материалы", "новое", "актуальное"
  const wantsLatest = /(последн|свеж|новы|новые|актуальн|материал|публикац|article|latest|recent|what'?s new)/.test(lower);
  if (wantsLatest) {
    const latest = await getLatestSiteContent(5);
    if (latest.length === 0) {
      return "NO_ARTICLES_FOUND: На сайте пока нет опубликованных материалов.";
    }
    const formatted = latest.map((it, i) => `ARTICLE:${i + 1}|${it.title}|${it.url}`).join("\n");
    return `ДОСТУПНЫЕ МАТЕРИАЛЫ (последние публикации):\n${formatted}`;
  }

  // Проверка региона (Европа и т.д.)
  const regionMatches = lower.match(/европ[аеыу]/);
  let regionResults: SiteItem[] = [];
  if (regionMatches) {
    regionResults = await getSiteContentByRegion("Европа", 5);
  }

  const results = await Promise.allSettled([
    regionResults.length > 0 ? Promise.resolve(regionResults) : getSiteContentByRegion(userMessage, 4),
    getSiteContentByCategory(userMessage, 4),
    getSiteContentBySection(userMessage, 4),
    getSiteContentByAuthor(userMessage, 4),
    searchSiteContent(userMessage, 5),
  ]);

  const collected: SiteItem[] = [];
  for (const res of results) {
    if (res.status === "fulfilled" && res.value?.length) {
      collected.push(...res.value);
    }
  }

  if (regionMatches && collected.length === 0) {
    return "NO_ARTICLES_FOUND: По запросу «Европа» материалов на сайте не найдено.";
  }

  const uniq = Array.from(
    new Map(collected.map((x) => [`${x.url || ""}|${x.title}|${x.author || ""}`, x])).values()
  ).slice(0, 7);

  // FIX: Если ничего не нашли — явное сообщение
  if (uniq.length === 0) {
    // Фоллбэк: отдаём последние статьи
    const fallback = await getLatestSiteContent(3);
    if (fallback.length > 0) {
      const formatted = fallback.map((it, i) => `ARTICLE:${i + 1}|${it.title}|${it.url}`).join("\n");
      return `Точных совпадений по запросу нет. Последние публикации сайта:\n${formatted}`;
    }
    return "NO_ARTICLES_FOUND: По запросу материалов на сайте не найдено. Предложи поиск вручную на /search или напиши на official@anounitedworld.com.";
  }

  const staticOverview = await getStaticPagesOverview();
  const staticBlock = staticOverview.length > 0
    ? `\nСтатические страницы:\n${staticOverview.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";

  return formatSiteContext(uniq) + staticBlock;
}

async function getWebContext(query: string, limit = 4): Promise<string[]> {
  const cacheKey = `web:${query.trim().toLowerCase()}:${limit}`;
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const search = new URLSearchParams({
      q: query,
      format: "json",
      no_html: "1",
      no_redirect: "1",
      skip_disambig: "1",
    });
    const res = await fetchWithTimeout(`https://api.duckduckgo.com/?${search.toString()}`);
    if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);

    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
    };

    const out: string[] = [];
    if (data.AbstractText) out.push(`${data.AbstractText}${data.AbstractURL ? ` (${data.AbstractURL})` : ""}`);

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

    const results = out.slice(0, limit);
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.error(`[mascot] Web search failed: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function isSiteQuestion(text: string): boolean {
  return /(на сайте|материал|стать[ья]|автор|раздел|рубрик|категор|поиск|опублик|последн|кто автор)/i.test(text);
}

function isWebQuestion(text: string): boolean {
  return /(сегодня|сейчас|новост|последни[ех]|за неделю|актуальн|в мире|что произошло|developments)/i.test(text);
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

function formatSiteContext(items: SiteItem[]): string {
  if (items.length === 0) return "NO_ARTICLES_FOUND: Достоверных материалов по этому запросу на сайте не найдено.";
  
  return items
    .map((it, i) => {
      if (it.url) {
        return `ARTICLE:${i+1}|${it.title}|${it.url}`;
      }
      return `ARTICLE:${i+1}|${it.title}|NO_URL`;
    })
    .join("\n");
}

export async function buildMascotRetrievalContext(userMessage: string): Promise<{
  strategy: SourceStrategy;
  contextText: string;
  preformattedList?: string;
}> {
  const strategy = resolveMascotSources(userMessage);
  console.log(`[mascot:retrieval] Strategy for "${userMessage}": ${strategy}`);
  
  let siteContext = "";
  let webContext = "";

  if (strategy === "site" || strategy === "site+web") {
    try {
      siteContext = await getRelevantSiteContext(userMessage);
    } catch (e) {
      console.error(`[mascot] site_context error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (strategy === "web" || strategy === "site+web") {
    try {
      const web = await getWebContext(userMessage, 4);
      webContext = web.length ? web.map((row, i) => `${i + 1}. ${row}`).join("\n") : "Ничего релевантного не найдено.";
    } catch (e) {
      console.error(`[mascot] web_context error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const blocks: string[] = [];
  if (siteContext) blocks.push(`SITE_CONTEXT:\n${siteContext}`);
  if (webContext) blocks.push(`WEB_CONTEXT:\n${webContext}`);

  if (blocks.length === 0) {
    return { strategy, contextText: "", preformattedList: undefined };
  }

  let preformattedList: string | undefined;
  if (siteContext && !siteContext.includes("NO_ARTICLES_FOUND") && !siteContext.includes("не найдено")) {
    const lines = siteContext.split("\n").filter(l => l.startsWith("ARTICLE:"));
    preformattedList = lines.map(line => {
      const parts = line.split("|");
      if (parts.length >= 3) {
        const title = parts[1];
        const url = parts[2];
        if (url !== "NO_URL") {
          return `${title} — ${url}`;
        }
        return title;
      }
      return line;
    }).join("\n");
  }

  let combined = blocks.join("\n\n");
  
  // FIX: Жёсткие инструкции для модели
  if (preformattedList && preformattedList.trim()) {
    combined += `\n\nВАЖНО! ПРАВИЛА ДЛЯ ОТВЕТА:\n1. Используй ТОЛЬКО эти ссылки из списка. Никаких выдуманных URL.\n2. Формат: "Заголовок — https://anounitedworld.com/articles/..." (через тире, БЕЗ markdown-ссылок, БЕЗ скобок).\n3. НЕ придумывай ссылки на /section/, /analytics/, /category/, /author/, если их нет в списке.\n4. Если хочешь сослаться на материал, которого нет в списке — НЕ давай ссылку, просто упомяни тему.`;
  }
  
  if (siteContext.includes("NO_ARTICLES_FOUND")) {
    combined += `\n\nКРИТИЧЕСКИ ВАЖНО: На сайте нет материалов по этому запросу. Честно скажи об этом пользователю. Предложи поиск на /search или написать на official@anounitedworld.com. ЗАПРЕЩЕНО выдумывать URL и названия несуществующих статей.`;
  }

  combined += "\n\nINSTRUCTIONS: Отвечай кратко, по делу. Упоминай материалы естественно в тексте ответа.";

  if (combined.length > 1400) {
    combined = combined.slice(0, 1350) + "\n[...контекст сокращён]";
  }

  console.log(`[mascot:retrieval] Final context length: ${combined.length} chars`);
  if (preformattedList) {
    console.log(`[mascot:retrieval] Preformatted list (${preformattedList.split("\n").length} items)`);
  }

  return { strategy, contextText: combined, preformattedList };
}
