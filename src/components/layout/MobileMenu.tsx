"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Section } from "@/lib/api";
import { getSectionHref } from "@/lib/navigation";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeHref } from "@/lib/i18n/types";
import { LanguageSwitch } from "./LanguageSwitch";

type MobileMenuProps = {
  sections: Section[];
  locale?: Locale;
  isOpen: boolean;
  onClose: () => void;
};

function MobileSectionNode({
  node,
  locale,
  depth,
  onClose,
}: {
  node: Section;
  locale: Locale;
  depth: number;
  onClose: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const href = localizeHref(getSectionHref(node.slug), locale);
  const indent = depth * 10;

  if (!hasChildren) {
    return (
      <Link
        href={href}
        onClick={onClose}
        className="block border-b border-neutral-200 py-3 text-sm text-text"
        style={{ paddingLeft: Math.max(indent, 4) }}
      >
        {locale === "en" ? (node.name_en || node.name) : node.name}
      </Link>
    );
  }

  return (
    <details className="group border-b border-neutral-200">
      <summary
        className="cursor-pointer list-none py-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink [&::-webkit-details-marker]:hidden"
        style={{ paddingLeft: indent }}
      >
        <span className="flex items-center justify-between gap-2 pr-1">
          <span>{locale === "en" ? (node.name_en || node.name) : node.name}</span>
          <svg
            className="h-4 w-4 shrink-0 transition group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </span>
      </summary>
      <div className="space-y-1 pb-3" style={{ paddingLeft: indent + 8 }}>
        <Link
          href={href}
          onClick={onClose}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gold-deep underline-offset-2 hover:underline"
        >
          {locale === "en" ? "Section:" : "Раздел:"}{" "}
          {locale === "en" ? (node.name_en || node.name) : node.name}
        </Link>
        {node.children.map((ch) => (
          <MobileSectionNode
            key={ch.id}
            node={ch}
            locale={locale}
            depth={depth + 1}
            onClose={onClose}
          />
        ))}
      </div>
    </details>
  );
}

export function MobileMenu({
  sections,
  locale = "ru",
  isOpen,
  onClose,
}: MobileMenuProps) {
  const dict = getDictionary(locale);
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
      className="fixed inset-0 z-[100] flex flex-col bg-paper-warm md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={locale === "en" ? "Menu" : "Меню"}
    >
      <div className="flex items-center justify-between border-b border-gold px-4 py-3">
        <span className="font-heading text-lg font-semibold text-ink">
          {locale === "en" ? "Menu" : "Меню"}
        </span>
        <div className="flex items-center gap-3">
          <LanguageSwitch className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:text-gold-deep" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-ink"
            aria-label={locale === "en" ? "Close menu" : "Закрыть меню"}
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
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <nav aria-label={locale === "en" ? "Site sections" : "Разделы сайта"}>
          <Link
            href={localizeHref("/search", locale)}
            onClick={onClose}
            className="mb-1 flex items-center gap-3 border-b border-neutral-200 py-3 pl-1 font-sans text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:text-gold-deep"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-gold-deep"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.2-4.2" />
            </svg>
            {dict.header.searchPlaceholder}
          </Link>
          {sections.map((root) => (
            <MobileSectionNode
              key={root.id}
              node={root}
              locale={locale}
              depth={0}
              onClose={onClose}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
