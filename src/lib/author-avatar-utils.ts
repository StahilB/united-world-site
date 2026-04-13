import { resolveStrapiAssetUrl } from "@/lib/strapi-config";

export function initials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "A";
}

export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * URL suitable for the browser, or `null` to show initials (empty, placeholder, or unloadable).
 * Rewrites internal Docker / loopback hosts to NEXT_PUBLIC_STRAPI_URL (see getPublicStrapiUrl).
 */
export function normalizeAvatarUrlForBrowser(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const u = raw.trim();
  if (u.includes("picsum")) return null;

  try {
    const parsed = new URL(u);
    const host = parsed.hostname;
    if (host === "strapi" || host === "localhost") {
      return resolveStrapiAssetUrl(u);
    }
    return u;
  } catch {
    if (u.startsWith("/")) {
      return resolveStrapiAssetUrl(u);
    }
    return null;
  }
}
