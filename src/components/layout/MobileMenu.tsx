"use client";

import Link from "next/link";
import { useEffect } from "react";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileMenu({
  isOpen,
  onClose,
}: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-surface md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Меню"
    >
      <div className="flex items-center justify-between border-b border-accent px-4 py-3">
        <span className="font-heading text-lg font-semibold text-primary">
          Меню
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center text-primary"
          aria-label="Закрыть меню"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <details className="group border-b border-neutral-200 py-3">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold uppercase tracking-wide text-primary [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Аналитика — регионы
              <svg
                className="h-4 w-4 transition group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </span>
          </summary>
          <ul className="mt-3 space-y-2 pl-1">
            <li>
              <Link
                href="/region/rossiya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Россия
              </Link>
            </li>
            <li>
              <Link
                href="/region/evropa"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Европа
              </Link>
            </li>
            <li>
              <Link
                href="/region/blizhnij-vostok"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Ближний Восток
              </Link>
            </li>
            <li>
              <Link
                href="/region/afrika"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Африка
              </Link>
            </li>
            <li>
              <Link
                href="/region/latinskaya-amerika"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Латинская Америка
              </Link>
            </li>
            <li>
              <Link
                href="/region/kavkaz"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Кавказ
              </Link>
            </li>
            <li>
              <Link
                href="/region/tsentralnaya-aziya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Центральная Азия
              </Link>
            </li>
            <li>
              <Link
                href="/region/yuzhnaya-aziya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Южная Азия
              </Link>
            </li>
            <li>
              <Link
                href="/region/yugo-vostochnaya-aziya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Юго-Восточная Азия
              </Link>
            </li>
            <li>
              <Link
                href="/region/vostochnaya-aziya-i-atr"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Восточная Азия и АТР
              </Link>
            </li>
            <li>
              <Link
                href="/region/severnaya-amerika"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Северная Америка
              </Link>
            </li>
            <li>
              <Link
                href="/region/avstraliya-i-okeaniya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Австралия и Океания
              </Link>
            </li>
            <li>
              <Link
                href="/region/arktika"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Арктика
              </Link>
            </li>
          </ul>
        </details>

        <details className="group border-b border-neutral-200 py-3">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold uppercase tracking-wide text-primary [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Аналитика — темы
              <svg
                className="h-4 w-4 transition group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </span>
          </summary>
          <ul className="mt-3 space-y-2 pl-1">
            <li>
              <Link
                href="/category/mezhdunarodnaya-bezopasnost"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Международная безопасность
              </Link>
            </li>
            <li>
              <Link
                href="/category/politika-i-diplomatiya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Политика и дипломатия
              </Link>
            </li>
            <li>
              <Link
                href="/category/ekonomika-i-razvitie"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Экономика и развитие
              </Link>
            </li>
            <li>
              <Link
                href="/category/energetika-i-resursy"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Энергетика и ресурсы
              </Link>
            </li>
            <li>
              <Link
                href="/category/ekologiya-i-klimat"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Экология и климат
              </Link>
            </li>
            <li>
              <Link
                href="/category/obrazovanie-i-kultura"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Образование и культура
              </Link>
            </li>
            <li>
              <Link
                href="/category/mezhdunarodnye-organizatsii"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Международные организации
              </Link>
            </li>
            <li>
              <Link
                href="/category/mezhdunarodnye-meropriyatiya"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Международные мероприятия
              </Link>
            </li>
          </ul>
        </details>

        <details className="group border-b border-neutral-200 py-3">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold uppercase tracking-wide text-primary [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Разделы
              <svg
                className="h-4 w-4 transition group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </span>
          </summary>
          <ul className="mt-3 space-y-2 pl-1">
            <li>
              <Link
                href="/analytics/situational"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Ситуативный анализ
              </Link>
            </li>
            <li>
              <Link
                href="/analytics/global"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Глобальные обзоры
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                О центре
              </Link>
            </li>
          </ul>
        </details>

        <details className="group border-b border-neutral-200 py-3">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold uppercase tracking-wide text-primary [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Экспертиза
              <svg
                className="h-4 w-4 transition group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </span>
          </summary>
          <ul className="mt-3 space-y-2 pl-1">
            <li>
              <Link
                href="/expertise/opinions"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Мнения
              </Link>
            </li>
            <li>
              <Link
                href="/expertise/interviews"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Интервью
              </Link>
            </li>
            <li>
              <Link
                href="/expertise/columns"
                onClick={onClose}
                className="block py-1 text-sm text-text"
              >
                Авторские колонки
              </Link>
            </li>
          </ul>
        </details>

        <nav className="mt-6 flex flex-col gap-4">
          <Link
            href="/about"
            onClick={onClose}
            className="font-sans text-sm font-semibold uppercase tracking-wide text-primary"
          >
            О центре
          </Link>
          <Link
            href="/en"
            onClick={onClose}
            className="font-sans text-sm font-semibold uppercase tracking-wide text-primary"
          >
            EN
          </Link>
        </nav>
      </div>
    </div>
  );
}
