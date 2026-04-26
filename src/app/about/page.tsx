import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";
import { getServerLocale } from "@/lib/i18n/server-locale";

export const metadata: Metadata = {
  title: "Об организации",
  description:
    "АНО «Единый Мир» — некоммерческая организация, содействующая общественной дипломатии и международному диалогу.",
};

export default async function AboutPage() {
  const locale = await getServerLocale();
  let html = "";
  try {
    const res = await getStaticPages();
    html =
      locale === "en"
        ? (res.data?.about_html_en ?? res.data?.about_html ?? "")
        : (res.data?.about_html ?? "");
  } catch (err) {
    console.error("[AboutPage] Failed to load static pages:", err);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <StaticPageContent html={html} />
      </div>
    </main>
  );
}
