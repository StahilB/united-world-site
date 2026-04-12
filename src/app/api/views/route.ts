import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || "";

export async function POST(request: Request) {
  try {
    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    if (STRAPI_TOKEN) {
      headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
    }

    // Найти статью по числовому id — получить documentId и views_count
    const findRes = await fetch(
      `${STRAPI_URL}/api/articles?filters[id][$eq]=${articleId}&fields[0]=views_count`,
      { headers }
    );

    if (!findRes.ok) {
      console.error("[views] Find failed:", findRes.status, await findRes.text());
      return NextResponse.json({ error: "Find failed" }, { status: 500 });
    }

    const findData = await findRes.json();
    const article = findData?.data?.[0];
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const documentId = article.documentId;
    const currentViews = article.views_count ?? 0;

    // Обновить через documentId (Strapi 5 REST API)
    const putRes = await fetch(
      `${STRAPI_URL}/api/articles/${documentId}`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: { views_count: currentViews + 1 },
        }),
      }
    );

    if (!putRes.ok) {
      console.error("[views] Update failed:", putRes.status, await putRes.text());
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ views: currentViews + 1 });
  } catch (e) {
    console.error("[views] Error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
