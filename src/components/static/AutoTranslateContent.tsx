"use client";

import { useEffect, useState } from "react";
import { StaticPageContent } from "./StaticPageContent";

type Props = {
  /** Готовый EN HTML, если есть — показываем сразу */
  htmlEn?: string;
  /** Русский HTML — для перевода если EN пустой */
  htmlRu?: string;
  /** Какое поле обновлять в Strapi после перевода */
  field: "about_html_en" | "cooperation_html_en" | "contacts_html_en" | "support_html_en";
};

export function AutoTranslateContent({ htmlEn, htmlRu, field }: Props) {
  const [html, setHtml] = useState(htmlEn ?? "");
  const [loading, setLoading] = useState(!htmlEn && !!htmlRu);

  useEffect(() => {
    if (htmlEn) return; // уже есть перевод
    if (!htmlRu) return; // нечего переводить

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/translate-static", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, ruHtml: htmlRu }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { html?: string };
        if (!cancelled && data.html) {
          setHtml(data.html);
        }
      } catch (e) {
        console.error("[AutoTranslate] failed:", e);
        // Fallback на русский если перевод не удался
        if (!cancelled) setHtml(htmlRu);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [htmlEn, htmlRu, field]);

  if (loading) {
    return (
      <div className="py-12 text-center text-text-mute font-sans text-[14px]">
        Translating to English...
      </div>
    );
  }

  return <StaticPageContent html={html} />;
}
