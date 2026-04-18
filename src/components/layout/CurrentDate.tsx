"use client";

import { useEffect, useState } from "react";

function formatMoscowDate(date: Date): { iso: string; label: string } {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  // yyyy-mm-dd для атрибута dateTime
  const isoParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return { iso: isoParts, label: parts };
}

export function CurrentDate({ className }: { className?: string }) {
  // Рендерим серверно стартовое значение (момент билда/запроса),
  // клиент заменит на реальное "сейчас"
  const [now, setNow] = useState(() => formatMoscowDate(new Date()));

  useEffect(() => {
    // Сразу при монтировании — актуализируем
    setNow(formatMoscowDate(new Date()));
    // И раз в минуту обновляем, чтобы после полуночи переключалось
    const id = setInterval(() => {
      setNow(formatMoscowDate(new Date()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={now.iso} className={className}>
      {now.label}
    </time>
  );
}
