import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware пишет в заголовок x-pathname текущий URL pathname,
 * чтобы server-components могли его прочитать через headers().
 *
 * Это нужно для определения локали (ru/en) в layout, который
 * нативно не получает pathname в Next.js App Router.
 */
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * Применять ко всем маршрутам, кроме статических ассетов и API,
 * чтобы не нагружать.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|uploads|sitemap.xml|robots.txt).*)",
  ],
};
