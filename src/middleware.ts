import { NextRequest, NextResponse } from "next/server";

/** Тип записи в wp-redirects.json */
type RedirectEntry = {
  wp_id: number;
  old_path: string; // /%d0%bf%d0%b0%d0%bc%d1%8f%d1%82%d1%8c-...
  old_path_decoded: string; // /память-против-забвения-...
  new_slug: string; // d0bfd0b0d0bcd18fd182d18c-... (актуальный)
};

// Загружаем карту один раз, на старте.
// При следующем деплое (с новым redirects.json) Next.js перезапустится
// и подхватит новую версию.
import wpRedirectsRaw from "../public/wp-redirects.json";
const wpRedirects = wpRedirectsRaw as RedirectEntry[];

// Индекс по old_path и old_path_decoded для O(1) lookup
const redirectIndex = new Map<string, string>();
for (const entry of wpRedirects) {
  // Ключи без хвостовых слешей и в нижнем регистре
  const norm = (p: string) =>
    p.toLowerCase().replace(/\/+$/, "");
  redirectIndex.set(norm(entry.old_path), entry.new_slug);
  if (entry.old_path_decoded) {
    redirectIndex.set(norm(entry.old_path_decoded), entry.new_slug);
  }
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // === 1. Проверка на старый WP-URL ===
  // Игнорируем технические маршруты
  const skipRedirect =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/articles/") ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/region/") ||
    pathname.startsWith("/section/") ||
    pathname.startsWith("/author/") ||
    pathname.startsWith("/expertise") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/contacts") ||
    pathname.startsWith("/cooperation") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/news") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/" ||
    pathname === "/en";

  if (!skipRedirect) {
    // Нормализуем pathname: убираем trailing slash, lowercase
    const normalized = pathname.toLowerCase().replace(/\/+$/, "");

    // Ищем в индексе — пробуем как percent-encoded, так и decoded
    let target = redirectIndex.get(normalized);

    // Если не нашли — пробуем декодировать сам pathname (может быть %D0%...)
    if (!target) {
      try {
        const decoded = decodeURIComponent(normalized);
        target = redirectIndex.get(decoded);
      } catch {
        // ignore
      }
    }

    if (target) {
      const url = req.nextUrl.clone();
      url.pathname = `/articles/${target}`;
      return NextResponse.redirect(url, 308);
    }
  }

  // === 2. Стандартный handler — выставляем x-pathname ===
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|uploads|sitemap.xml|robots.txt).*)",
  ],
};
