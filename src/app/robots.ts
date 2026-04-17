import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/", "/search", "/_next/", "/*?*utm_"],
      },
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/", "/search"],
        crawlDelay: 1,
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-news.xml`],
    host: SITE_URL,
  };
}
