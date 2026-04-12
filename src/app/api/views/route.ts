import { NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || "";

export async function POST(request: Request) {
  try {
    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
    }

    // Получить текущий views_count
    const getRes = await fetch(
      `${STRAPI_URL}/api/articles/${articleId}?fields[0]=views_count`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
      }
    );
    if (!getRes.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
    const getData = await getRes.json();
    const currentViews = getData?.data?.views_count ?? 0;

    // Обновить views_count + 1
    const putRes = await fetch(
      `${STRAPI_URL}/api/articles/${articleId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: { views_count: currentViews + 1 },
        }),
      }
    );

    if (!putRes.ok) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ views: currentViews + 1 });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
