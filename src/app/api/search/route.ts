import { NextResponse, type NextRequest } from "next/server";
import { searchArticles } from "@/lib/api";
import { getStrapiUrl } from "@/lib/strapi-config";
import { mapStrapiArticleToArticle } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseFormats(sp: URLSearchParams): string[] {
  const all = sp.getAll("format");
  if (all.length === 0) return [];
  if (all.length === 1 && all[0].includes(",")) {
    return all[0].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return all;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const q = sp.get("q") ?? undefined;
  const formats = parseFormats(sp);
  const region = sp.get("region") ?? undefined;
  const category = sp.get("category") ?? undefined;
  const author = sp.get("author") ?? undefined;
  const dateFrom = sp.get("dateFrom") ?? undefined;
  const dateTo = sp.get("dateTo") ?? undefined;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(sp.get("pageSize") ?? "12", 10) || 12),
  );

  try {
    const res = await searchArticles({
      q,
      formats,
      region,
      category,
      author,
      dateFrom,
      dateTo,
      page,
      pageSize,
    });

    const origin = getStrapiUrl();
    const articles: Article[] = res.data.map((a) =>
      mapStrapiArticleToArticle(a, origin),
    );

    return NextResponse.json({
      articles,
      meta: res.meta ?? {
        pagination: {
          page,
          pageSize,
          pageCount: 1,
          total: articles.length,
        },
      },
    });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed", articles: [] },
      { status: 500 },
    );
  }
}
