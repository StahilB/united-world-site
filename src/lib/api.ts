import type { Article, Category, Region } from "./types";
import {
  getArticleBySlug as findArticleBySlug,
  mockCategories,
  mockRegions,
} from "./mock-data";

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return Promise.resolve(findArticleBySlug(slug) ?? null);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return Promise.resolve(
    mockCategories.find((c) => c.slug === slug) ?? null,
  );
}

export async function getRegionBySlug(slug: string): Promise<Region | null> {
  return Promise.resolve(mockRegions.find((r) => r.slug === slug) ?? null);
}
