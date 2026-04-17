import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";

export const metadata: Metadata = {
  title: "Поддержать",
  description: "Как поддержать деятельность аналитического центра «Единый Мир».",
};

export default async function SupportPage() {
  let html = "";
  try {
    const res = await getStaticPages();
    html = res.data?.support_html ?? "";
  } catch (err) {
    console.error("[SupportPage] Failed to load static pages:", err);
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <StaticPageContent html={html} />
      </div>
    </main>
  );
}
