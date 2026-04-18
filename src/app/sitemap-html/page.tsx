import Link from "next/link";
import { getArticles, getSections, type Section } from "@/lib/api";

export const dynamic = "force-dynamic";

function flattenSections(tree: Section[]): Section[] {
  const out: Section[] = [];
  const queue = [...tree];
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    out.push(item);
    queue.push(...item.children);
  }
  return out;
}

export default async function SitemapHtmlPage() {
  const sectionTree = await getSections(false).catch(() => []);
  const sections = flattenSections(sectionTree);

  const articles: Array<{ slug: string; title: string }> = [];
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 50) {
      const res = await getArticles({ page, pageSize: 100, sort: "publication_date:desc" });
      const items = res.data ?? [];
      items.forEach((a) => {
        articles.push({ slug: a.slug, title: a.title });
      });
      const total = res.meta?.pagination?.total ?? articles.length;
      hasMore = items.length > 0 && articles.length < total;
      page += 1;
    }
  } catch (e) {
    console.error("[sitemap-html] failed to load articles:", e);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal text-ink md:text-4xl">
          Карта сайта
        </h1>

        <section className="mt-10">
          <h2 className="font-heading text-2xl font-normal text-ink">Разделы</h2>
          {sections.length === 0 ? (
            <p className="mt-3 font-sans text-sm text-text-mute">Разделы пока не найдены.</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/section/${s.slug}`}
                    className="font-sans text-sm text-ink underline decoration-ink/20 underline-offset-2 hover:text-gold-deep"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-2xl font-normal text-ink">Статьи</h2>
          {articles.length === 0 ? (
            <p className="mt-3 font-sans text-sm text-text-mute">Статьи пока не найдены.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/articles/${a.slug}`}
                    className="font-sans text-sm text-ink underline decoration-ink/20 underline-offset-2 hover:text-gold-deep"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
