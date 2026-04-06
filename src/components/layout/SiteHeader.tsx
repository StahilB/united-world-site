import { getCategories, getRegions } from "@/lib/api";
import type { StrapiCategory, StrapiRegion } from "@/lib/strapi-types";
import type { Category, Region } from "@/lib/types";
import { Header } from "./Header";

function mapRegion(r: StrapiRegion): Region {
  return {
    id: String(r.id),
    name: r.name,
    slug: r.slug,
  };
}

function mapCategory(c: StrapiCategory): Category {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    color: c.color ?? "#14213D",
  };
}

/** Загружает регионы и темы из Strapi для мега-меню (ссылки совпадают с API). */
export async function SiteHeader() {
  let regions: Region[] = [];
  let categories: Category[] = [];

  try {
    const [regionsRes, categoriesRes] = await Promise.all([
      getRegions(),
      getCategories(),
    ]);
    regions = (regionsRes.data ?? []).map(mapRegion);
    categories = (categoriesRes.data ?? []).map(mapCategory);
  } catch (e) {
    console.error("[SiteHeader] Strapi fetch failed:", e);
  }

  return <Header regions={regions} categories={categories} />;
}
