import { getCategories, getRegions, getSections, type Section } from "@/lib/api";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { Header } from "./Header";

/** Загружает дерево разделов из Strapi для навигации (кэш revalidate в getSections). */
export async function SiteHeader() {
  const locale = await getServerLocale();
  const [sectionsRes, regionsRes, categoriesRes] = await Promise.all([
    getSections().catch(() => [] as Section[]),
    getRegions().catch(() => ({ data: [] as Array<{ name: string; name_en?: string | null; slug: string }> })),
    getCategories().catch(() => ({ data: [] as Array<{ name: string; name_en?: string | null; slug: string }> })),
  ]);

  const pickName = (item: { name: string; name_en?: string | null }) =>
    locale === "en" && item.name_en ? item.name_en : item.name;

  const regions = (regionsRes.data ?? []).map((r) => ({
    label: pickName(r),
    href: `/region/${r.slug}`,
  }));

  const categories = (categoriesRes.data ?? []).map((c) => ({
    label: pickName(c),
    href: `/category/${c.slug}`,
  }));

  const globalReviews = (regionsRes.data ?? []).map((r) => ({
    label: pickName(r),
    href: `/section/globalnye-obzory/${r.slug}`,
  }));

  return (
    <Header
      sections={sectionsRes}
      locale={locale}
      regions={regions}
      categories={categories}
      globalReviews={globalReviews}
    />
  );
}
