import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
const IS_PRODUCTION_DOMAIN = SITE_URL.includes("anounitedworld.com");

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DOMAIN) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/",
          "/search",
          "/_next/",
          "/*?*utm_",
        ],
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
