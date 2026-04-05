"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Category, Region } from "@/lib/types";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  regions: Region[];
  categories: Category[];
};

export function MobileMenu({
  isOpen,
  onClose,
  regions,
  categories,
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
            {regions.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/region/${r.slug}`}
                  onClick={onClose}
                  className="block py-1 text-sm text-text"
                >
                  {r.name}
                </Link>
              </li>
            ))}
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
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  onClick={onClose}
                  className="block py-1 text-sm text-text"
                >
                  {c.name}
                </Link>
              </li>
            ))}
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

        <nav className="mt-6 flex flex-col gap-4">
          <Link
            href="/expertise"
            onClick={onClose}
            className="font-sans text-sm font-semibold uppercase tracking-wide text-primary"
          >
            Экспертиза
          </Link>
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
