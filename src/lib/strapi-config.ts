/** Strapi base URL for server and client (NEXT_PUBLIC_* is inlined in browser bundles). */
export function getStrapiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL ||
    "http://localhost:1337"
  ).replace(/\/$/, "");
}
