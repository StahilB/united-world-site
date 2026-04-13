/** Strapi base URL for server and client (NEXT_PUBLIC_* is inlined in browser bundles). */
export function getStrapiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL ||
    "http://localhost:1337"
  ).replace(/\/$/, "");
}

/**
 * Public origin for asset URLs in HTML (uploads, avatars). Must be reachable from the user’s browser.
 * Prefer NEXT_PUBLIC_STRAPI_URL; never use the Docker-internal STRAPI_URL (e.g. http://strapi:1337) here.
 */
export function getPublicStrapiUrl(): string {
  const v = process.env.NEXT_PUBLIC_STRAPI_URL?.trim();
  if (v) return v.replace(/\/$/, "");
  return "http://localhost:1337";
}

/**
 * Normalizes Strapi upload URLs for HTML / Image `src` (relative, or absolute with internal host).
 */
export function resolveStrapiAssetUrl(url: string): string {
  const publicOrigin = getPublicStrapiUrl();
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      const parsed = new URL(u);
      if (parsed.hostname === "strapi" || parsed.hostname === "localhost") {
        return `${publicOrigin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return u;
    }
    return u;
  }
  return `${publicOrigin}${u.startsWith("/") ? "" : "/"}${u}`;
}
