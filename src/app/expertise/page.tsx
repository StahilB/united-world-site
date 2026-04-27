import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { localizeHref } from "@/lib/i18n/types";

export async function generateMetadata() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.expertise.title,
    description: dict.expertise.description,
  };
}

export default async function ExpertiseHubPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);

  return (
    <main className="min-h-screen bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal tracking-tight text-ink md:text-4xl">
          {dict.expertise.title}
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-base text-ink-soft">
          {dict.expertise.description}
        </p>
        <ul className="mt-10 space-y-4 font-sans text-lg">
          <li>
            <Link
              href={localizeHref("/expertise/opinions", locale)}
              className="text-gold-deep underline-offset-4 hover:underline"
            >
              {dict.expertise.opinions}
            </Link>
          </li>
          <li>
            <Link
              href={localizeHref("/expertise/interviews", locale)}
              className="text-gold-deep underline-offset-4 hover:underline"
            >
              {dict.expertise.interviews}
            </Link>
          </li>
          <li>
            <Link
              href={localizeHref("/expertise/columns", locale)}
              className="text-gold-deep underline-offset-4 hover:underline"
            >
              {dict.expertise.columns}
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
