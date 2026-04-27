import { getArticlesForColumnsSection } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { localizeHref, type Locale } from "@/lib/i18n/types";
import { resolveStrapiAssetUrl } from "@/lib/strapi-config";
import type { StrapiAuthor, StrapiArticle, StrapiMedia } from "@/lib/strapi-types";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

function columnAuthorPhotoUrl(media: StrapiMedia | null | undefined): string | null {
  if (!media?.url) return null;
  return resolveStrapiAssetUrl(media.url);
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

function AuthorCard({
  a,
  locale,
}: {
  a: StrapiAuthor;
  locale: Locale;
}) {
  const name = locale === "en" && a.name_en ? a.name_en : a.name;
  const bio = locale === "en" && a.bio_en ? a.bio_en : a.bio;
  const href = localizeHref(`/author/${a.slug}?from=columns`, locale);
  const photo = columnAuthorPhotoUrl(a.photo ?? undefined);
  const bgHue = hueFromString(a.slug || a.name || "");
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-md border border-neutral-200 bg-white p-5 transition-all duration-300 ease-in-out hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(20,33,61,0.10)]"
    >
      <div className="flex items-start gap-4">
        {photo ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-paper-warm">
            <Image
              src={photo}
              alt={name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
            style={{ backgroundColor: `hsl(${bgHue} 45% 40%)` }}
            aria-hidden
          >
            {initials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="font-sans text-[18px] font-bold leading-snug text-ink group-hover:text-gold-deep">
            {name}
          </div>
          <p className="mt-2 overflow-hidden font-sans text-sm leading-relaxed text-text-mute [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
            {bio || " "}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function ExpertiseColumnsPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  let authors: StrapiAuthor[] = [];

  try {
    // Загружаем статьи по `sections.slug = авторские колонки`, затем группируем по автору.
    const articles: StrapiArticle[] = await getArticlesForColumnsSection(100);
    const byId = new Map<number, StrapiAuthor>();
    for (const row of articles) {
      const a = row.author;
      if (a?.id != null) {
        byId.set(a.id, a);
      }
    }
    authors = Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru"),
    );
  } catch (e) {
    console.error("[ExpertiseColumnsPage] fetch failed:", e);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
          {dict.expertise.columns}
        </h1>

        {authors.length === 0 ? (
          <p className="mt-10 font-sans text-base text-text-mute">
            {dict.expertise.columnsEmpty}
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {authors.map((a) => (
              <AuthorCard key={a.id} a={a} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
