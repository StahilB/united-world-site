import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import { StaticPageContent } from "@/components/static/StaticPageContent";

export const metadata: Metadata = {
  title: "Контакты — АНО «Единый Мир»",
  description:
    "Адрес, телефон, e-mail и социальные сети АНО «Единый Мир».",
};

export default async function ContactsPage() {
  let html = "";
  try {
    const res = await getStaticPages();
    html = res.data?.contacts_html ?? "";
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
