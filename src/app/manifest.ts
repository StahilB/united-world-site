import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Единый Мир — аналитический центр",
    short_name: "Единый Мир",
    description: "Аналитический центр общественной дипломатии",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F0",
    theme_color: "#0F1B2D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
