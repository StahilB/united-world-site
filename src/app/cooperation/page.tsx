import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { AutoTranslateContent } from "@/components/static/AutoTranslateContent";

export const metadata: Metadata = {
  title: "Сотрудничество",
  description:
    "Направления сотрудничества аналитического центра «Единый Мир» для партнеров, экспертов и организаций.",
};

export default async function CooperationPage() {
  const locale = await getServerLocale();
  let ruHtml = "";
  let enHtml = "";
  try {
    const res = await getStaticPages();
    const data = res.data ?? {};
    ruHtml = data.cooperation_html ?? "";
    enHtml = data.cooperation_html_en ?? "";
  } catch (err) {
    console.error("[CooperationPage] Failed to load static pages:", err);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {locale === "en" ? (
          <AutoTranslateContent
            htmlEn={enHtml}
            htmlRu={ruHtml}
            field="cooperation_html_en"
          />
        ) : (
          <StaticPageContent html={ruHtml} />
        )}
      </div>
    </main>
  );
}
