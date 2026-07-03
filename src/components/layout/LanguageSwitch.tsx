"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function LanguageSwitch({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const [isEnSubdomain, setIsEnSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Проверяем, начинается ли хост с en.
      setIsEnSubdomain(window.location.hostname.startsWith("en."));
    }
  }, []);

  // Если мы на EN поддомене -> ведем на RU (основной)
  // Если мы на RU (основном) -> ведем на EN (поддомен)
  const targetHost = isEnSubdomain 
    ? "https://anounitedworld.com" 
    : "https://en.anounitedworld.com";

  // Собираем полный URL: Домен + текущий путь (pathname)
  // Это позволит юзеру остаться на той же статье при смене языка
  const targetHref = `${targetHost}${pathname}`;

  return (
    <a
      href={targetHref}
      aria-label={
        isEnSubdomain
          ? "Переключить на русскую версию"
          : "Switch to English version"
      }
      className={`${className} inline-flex items-center leading-none transition-opacity hover:opacity-70`}
      style={{ verticalAlign: 'baseline' }} 
    >
      {isEnSubdomain ? "RU" : "EN"}
    </a>
  );
}