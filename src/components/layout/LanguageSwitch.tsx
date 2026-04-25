"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/types";
import {
  localizeHref,
  stripLocaleFromPathname,
  localeFromPathname,
} from "@/lib/i18n/types";

export function LanguageSwitch({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const currentLocale = localeFromPathname(pathname);
  const targetLocale: Locale = currentLocale === "ru" ? "en" : "ru";
  const baseHref = stripLocaleFromPathname(pathname);
  const targetHref = localizeHref(baseHref, targetLocale);

  return (
    <Link
      href={targetHref}
      hrefLang={targetLocale}
      aria-label={
        targetLocale === "en"
          ? "Switch to English version"
          : "Переключить на русскую версию"
      }
      className={className}
    >
      {targetLocale === "en" ? "EN" : "RU"}
    </Link>
  );
}
