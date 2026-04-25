/**
 * Поддерживаемые локали сайта.
 * - 'ru' — основная (по умолчанию)
 * - 'en' — английская
 */
export type Locale = "ru" | "en";

export const LOCALES: Locale[] = ["ru", "en"];
export const DEFAULT_LOCALE: Locale = "ru";

/** Префикс пути для локали. Для дефолта — пустая строка. */
export function localePathPrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Сборка локализованного href.
 * Принимает абсолютный путь без локали (например "/articles/foo")
 * и возвращает с локалью ("/en/articles/foo" для en, "/articles/foo" для ru).
 */
export function localizeHref(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  // /articles/foo → /en/articles/foo
  if (path === "/" || path === "") return `/${locale}`;
  if (path.startsWith("/")) return `/${locale}${path}`;
  return `/${locale}/${path}`;
}

/**
 * Извлечение локали из URL pathname.
 * /en/articles/foo → 'en', /articles/foo → 'ru'
 */
export function localeFromPathname(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "ru";
}

/**
 * Удалить префикс локали из пути для вычисления "alternate" ссылок.
 * /en/articles/foo → /articles/foo
 * /articles/foo → /articles/foo
 */
export function stripLocaleFromPathname(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}
