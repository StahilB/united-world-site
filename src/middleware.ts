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
  // Редиректы старых/неправильных ссылок /section/<bare-slug> на
  // правильный маршрут (тема → /category, регион → /region,
  // глобальные обзоры → /section/globalnye-obzory?region=).
  const SECTION_TO_CATEGORY = new Set([
    "mezhdunarodnaya-bezopasnost",
    "politika-i-diplomatiya",
    "ekonomika-i-razvitie",
    "energetika-i-resursy",
    "energiya-i-resursy",
    "ekologiya-i-klimat",
    "obrazovanie-i-kultura",
    "obrazovanie-nauka-i-kultura",
    "mezhdunarodnye-organizatsii",
    "mezhdunarodnye-meropriyatiya",
  ]);
  const SECTION_TO_REGION = new Set([
    "rossiya",
    "evropa",
    "blizhniy-vostok",
    "afrika",
    "latinskaya-amerika",
    "kavkaz",
    "tsentralnaya-aziya",
    "yuzhnaya-aziya",
    "yugo-vostochnaya-aziya",
    "vostochnaya-aziya-i-atr",
    "severnaya-amerika",
    "avstraliya-i-okeaniya",
    "arktika",
  ]);

  const sectionMatch = req.nextUrl.pathname.match(
    /^(\/en)?\/section\/([^/?#]+)\/?$/,
  );
  if (sectionMatch) {
    const enPrefix = sectionMatch[1] ?? "";
    const slug = sectionMatch[2];

    // /section/<theme-bare> → /category/<theme-bare>
    if (SECTION_TO_CATEGORY.has(slug)) {
      const url = req.nextUrl.clone();
      url.pathname = `${enPrefix}/category/${slug}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
    // /section/<region-bare> → /region/<region-bare>
    if (SECTION_TO_REGION.has(slug)) {
      const url = req.nextUrl.clone();
      url.pathname = `${enPrefix}/region/${slug}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
    // /section/<theme>-po-temam → /category/<theme>
    if (slug.endsWith("-po-temam")) {
      const base = slug.replace(/-po-temam$/, "");
      const url = req.nextUrl.clone();
      url.pathname = `${enPrefix}/category/${base}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
    // /section/<region>-po-regionam → /region/<region>
    if (slug.endsWith("-po-regionam")) {
      const base = slug.replace(/-po-regionam$/, "");
      const url = req.nextUrl.clone();
      url.pathname = `${enPrefix}/region/${base}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
    // /section/<region>-globalnye-obzory → /section/globalnye-obzory?region=<region>
    if (slug.endsWith("-globalnye-obzory") && slug !== "globalnye-obzory") {
      const base = slug.replace(/-globalnye-obzory$/, "");
      const url = req.nextUrl.clone();
      url.pathname = `${enPrefix}/section/globalnye-obzory`;
      url.search = `?region=${base}`;
      return NextResponse.redirect(url, 308);
    }
  }

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
