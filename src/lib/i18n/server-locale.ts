import { headers } from "next/headers";
import type { Locale } from "./types";
import { localeFromPathname } from "./types";

/**
 * Получить локаль текущего запроса в server-component.
 * Читает заголовок x-pathname (его выставляет middleware) или
 * fallback на 'ru'.
 *
 * NOTE: Next.js НЕ передаёт pathname в layout/page нативно — нужен
 * middleware с rewrite, который добавит этот заголовок.
 */
export async function getServerLocale(): Promise<Locale> {
  const h = await headers();
  const pathname =
    h.get("x-pathname") ||
    h.get("x-invoke-path") ||
    "/";
  return localeFromPathname(pathname);
}
