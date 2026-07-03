import { headers } from "next/headers";
import type { Locale } from "./types";
import { localeFromPathname } from "./types";

export async function getServerLocale(): Promise<Locale> {
  const h = await headers();
  
  const forcedLocale = h.get("x-nextjs-locale");
  if (forcedLocale === "en" || forcedLocale === "ru") {
    return forcedLocale as Locale;
  }

  const host = h.get("host") || "";
  if (host.includes("en.anounitedworld.com")) {
    return "en";
  }

  const pathname =
    h.get("x-pathname") ||
    h.get("x-invoke-path") ||
    "/";
    
  return localeFromPathname(pathname);
}