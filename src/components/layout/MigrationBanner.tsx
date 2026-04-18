"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "migration_banner_v2_dismissed";

export function MigrationBanner() {
  // mounted защищает от flash при SSR → клиенте
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // sessionStorage может быть недоступен в приватных режимах — игнорируем
    }
  }, []);

  // На сервере и до mount показываем placeholder (держим высоту)
  // чтобы не было прыжка контента при появлении
  if (!mounted) {
    return <div className="h-[44px] bg-ink" aria-hidden="true" />;
  }

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Информация о переезде сайта"
      className="relative z-[60] border-b-2 border-accent bg-ink px-4 py-2.5 text-surface"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 pr-10 text-center text-sm leading-snug sm:text-base">
        <span>
          Мы переезжаем на новый сайт. Актуальные материалы смотрите на{" "}
          <a
            href="https://old.anounitedworld.com"
            className="font-semibold text-accent underline underline-offset-2 transition hover:text-surface"
            target="_blank"
            rel="noopener noreferrer"
          >
            old.anounitedworld.com
          </a>
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Закрыть объявление"
        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xl leading-none text-surface/70 transition hover:text-surface"
      >
        ×
      </button>
    </div>
  );
}
