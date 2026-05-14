import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const pathname = url.pathname;

  // 1. ИГНОРИРУЕМ ВСЮ СТАТИКУ И КАРТИНКИ (включая внутренние рерайты)
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('/uploads/') || 
    pathname.includes('/wp-content/') ||
    pathname.includes('strapi') ||
    /\.(jpg|jpeg|png|webp|avif|gif|svg|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. ЛОГИКА ДЛЯ АНГЛИЙСКОГО ПОДДОМЕНА
  if (hostname.includes("en.anounitedworld.com")) {
    if (pathname.startsWith("/en")) {
      const newPath = pathname.replace(/^\/en/, "") || "/";
      url.pathname = newPath;
      return NextResponse.redirect(url, 308);
    }
    
    url.pathname = `/en${pathname}`;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", pathname);
    requestHeaders.set("x-nextjs-locale", "en"); 
    
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|favicon.ico|sitemap.xml|robots.txt).*)"],
};