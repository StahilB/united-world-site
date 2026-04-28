import { getCategories, getRegions, getSections, type Section } from "@/lib/api";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { Header } from "./Header";

export async function SiteHeader() {
  const locale = await getServerLocale();
  const [sectionsRes, regionsRes, categoriesRes] = await Promise.all([
    getSections().catch(() => [] as Section[]),
    getRegions().catch(() => ({
      data: [] as Array<{
        name: string;
        name_en?: string | null;
        slug: string;
      }>,
    })),
    getCategories().catch(() => ({
      data: [] as Array<{
        name: string;
        name_en?: string | null;
        slug: string;
      }>,
    })),
  ]);

  const pickName = (item: { name: string; name_en?: string | null }) =>
    locale === "en" && item.name_en ? item.name_en : item.name;

  // По регионам → /region/<slug> (статьи привязанные к региону)
  const regions = (regionsRes.data ?? []).map((r) => ({
    label: pickName(r),
    href: `/region/${r.slug}`,
  }));

  // По темам → /category/<slug> (статьи привязанные к категории)
  const categories = (categoriesRes.data ?? []).map((c) => ({
    label: pickName(c),
    href: `/category/${c.slug}`,
  }));

  // Глобальные обзоры → /section/globalnye-obzory?region=<slug>
  // (фильтр по региону, через query-параметр).
  const globalReviews = (regionsRes.data ?? []).map((r) => ({
    label: pickName(r),
    href: `/section/globalnye-obzory?region=${r.slug}`,
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
