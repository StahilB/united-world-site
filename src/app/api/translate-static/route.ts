import { NextRequest } from "next/server";
import { translateGigaChat } from "@/lib/translate/gigachat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { field, ruHtml } = (await req.json()) as {
      field?: string;
      ruHtml?: string;
    };

    if (!field || typeof field !== "string") {
      return Response.json({ error: "field required" }, { status: 400 });
    }
    const allowedFields = [
      "about_html_en",
      "cooperation_html_en",
      "contacts_html_en",
      "support_html_en",
    ];
    if (!allowedFields.includes(field)) {
      return Response.json({ error: "field not allowed" }, { status: 400 });
    }
    if (!ruHtml || typeof ruHtml !== "string" || ruHtml.length < 20) {
      return Response.json({ error: "ruHtml empty" }, { status: 400 });
    }
    if (!STRAPI_URL || !STRAPI_TOKEN) {
      return Response.json({ error: "strapi env missing" }, { status: 500 });
    }

    // Перевод через GigaChat
    const translated = await translateGigaChat(ruHtml);

    // Сохраняем в Strapi (single type static-page)
    const writeRes = await fetch(`${STRAPI_URL}/api/static-page`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { [field]: translated } }),
    });

    if (!writeRes.ok) {
      console.error("[translate-static] Strapi write failed:", await writeRes.text());
      // Не падаем — отдадим перевод клиенту хотя бы для текущего показа
    }

    return Response.json({ html: translated });
  } catch (e) {
    console.error("[translate-static] error:", e);
    return Response.json({ error: "translate failed" }, { status: 500 });
  }
}
