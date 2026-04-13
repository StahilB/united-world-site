import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";

export const metadata: Metadata = {
  title: "Сотрудничество — АНО «Единый Мир»",
  description:
    "Направления сотрудничества и контакты АНО «Единый Мир» для аналитических центров, СМИ и экспертов.",
};

export default async function CooperationPage() {
  let html = "";
  try {
    const res = await getStaticPages();
    html = res.data?.cooperation_html ?? "";
  } catch {
    // ignore
  }

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <StaticPageContent html={html} />
      </div>
    </main>
  );
}
