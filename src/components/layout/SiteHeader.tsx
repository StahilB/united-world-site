import { getSections, type Section } from "@/lib/api";
import { Header } from "./Header";

/** Загружает дерево разделов из Strapi для навигации (кэш revalidate в getSections). */
export async function SiteHeader() {
  let sections: Section[] = [];
  try {
    sections = await getSections();
  } catch (e) {
    console.error("[SiteHeader] getSections failed:", e);
  }

  return <Header sections={sections} />;
}
