import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { AutoTranslateContent } from "@/components/static/AutoTranslateContent";

export const metadata: Metadata = {
  title: "Поддержать",
  description: "Как поддержать деятельность аналитического центра «Единый Мир».",
};

export default async function SupportPage() {
  const locale = await getServerLocale();
  let ruHtml = "";
  let enHtml = "";
  try {
    const res = await getStaticPages();
    const data = res.data ?? {};
    ruHtml = data.support_html ?? "";
    enHtml = data.support_html_en ?? "";
  } catch (err) {
    console.error("[SupportPage] Failed to load static pages:", err);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {locale === "en" ? (
          <AutoTranslateContent
            htmlEn={enHtml}
            htmlRu={ruHtml}
            field="support_html_en"
          />
        ) : (
          <StaticPageContent html={ruHtml} />
        )}
      </div>
    </main>
  );
}
