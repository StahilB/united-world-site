import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticlesByAuthor, getAuthorBySlug } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { formatDateRu, mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { StrapiMedia } from "@/lib/strapi-types";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

function mediaUrl(origin: string, media: StrapiMedia | null | undefined): string | null {
  if (!media?.url) return null;
  const u = media.url;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${origin}${u.startsWith("/") ? "" : "/"}${u}`;
}

function initials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "A";
}

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

function ArticleCard({ article }: { article: Article }) {
  const href = `/articles/${article.slug}`;
  const rubric = article.categories[0]?.name ?? article.format;
  return (
    <article className="flex h-full min-h-0 flex-col bg-white">
      <Link
        href={href}
        className="group flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white transition-all duration-300 ease-in-out hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(20,33,61,0.10)]"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 pt-5 md:p-5">
          <span className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {rubric}
          </span>
          <h2 className="font-heading text-xl font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent md:text-[22px]">
            {article.title}
          </h2>
          <time
            className="mt-3 font-sans text-[12px] text-muted"
            dateTime={article.publishedAt}
          >
            {formatDateRu(article.publishedAt)}
          </time>
        </div>
      </Link>
    </article>
  );
}

type AuthorPageProps = {
  params: { slug: string };
};

export default async function AuthorPage({ params }: AuthorPageProps) {
  const origin = getStrapiUrl();
  const slug = params.slug;

  const author = await getAuthorBySlug(slug).catch(() => null);
  if (!author) notFound();

  let articles: Article[] = [];
  try {
    const res = await getArticlesByAuthor(slug, LIST_LIMIT);
    articles = res.data.map((a) => mapStrapiArticleToArticle(a, origin));
  } catch (e) {
    console.error("[AuthorPage] articles fetch failed:", e);
  }

  const photo = mediaUrl(origin, author.photo ?? undefined);
  const bgHue = hueFromString(author.slug || author.name || "");

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <section className="flex flex-col gap-5 border-b border-neutral-200 pb-10 md:flex-row md:items-center md:gap-8">
          {photo ? (
            <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full bg-surface">
              <Image
                src={photo}
                alt={author.name}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
          ) : (
            <div
              className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
              style={{ backgroundColor: `hsl(${bgHue} 45% 40%)` }}
              aria-hidden
            >
              {initials(author.name)}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-primary md:text-4xl">
              {author.name}
            </h1>
            <p className="mt-3 max-w-3xl font-sans text-base leading-relaxed text-muted">
              {author.bio || ""}
            </p>
          </div>
        </section>

        <section className="pt-10">
          {articles.length === 0 ? (
            <p className="font-sans text-base text-muted">
              У этого автора пока нет публикаций
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

