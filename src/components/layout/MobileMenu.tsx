"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Section } from "@/lib/api";
import { getSectionHref } from "@/lib/navigation";

type MobileMenuProps = {
  sections: Section[];
  isOpen: boolean;
  onClose: () => void;
};

function MobileSectionNode({
  node,
  depth,
  onClose,
}: {
  node: Section;
  depth: number;
  onClose: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const href = getSectionHref(node.slug);
  const indent = depth * 10;

  if (node.slug === "en") {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="block border-b border-neutral-200 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-primary"
        style={{ paddingLeft: indent }}
      >
        {node.name}
      </a>
    );
  }

  if (!hasChildren) {
    return (
      <Link
        href={href}
        onClick={onClose}
        className="block border-b border-neutral-200 py-3 text-sm text-text"
        style={{ paddingLeft: Math.max(indent, 4) }}
      >
        {node.name}
      </Link>
    );
  }

  return (
    <details className="group border-b border-neutral-200">
      <summary
        className="cursor-pointer list-none py-3 font-sans text-sm font-semibold uppercase tracking-wide text-primary [&::-webkit-details-marker]:hidden"
        style={{ paddingLeft: indent }}
      >
        <span className="flex items-center justify-between gap-2 pr-1">
          <span>{node.name}</span>
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
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-accent underline-offset-2 hover:underline"
        >
          Раздел: {node.name}
        </Link>
        {node.children.map((ch) => (
          <MobileSectionNode
            key={ch.id}
            node={ch}
            depth={depth + 1}
            onClose={onClose}
          />
        ))}
      </div>
    </details>
  );
}

export function MobileMenu({ sections, isOpen, onClose }: MobileMenuProps) {
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

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <nav aria-label="Разделы сайта">
          <Link
            href="/search"
            onClick={onClose}
            className="mb-1 flex items-center gap-3 border-b border-neutral-200 py-3 pl-1 font-sans text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:text-accent"
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
              className="shrink-0 text-accent"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.2-4.2" />
            </svg>
            Поиск
          </Link>
          {sections.map((root) => (
            <MobileSectionNode
              key={root.id}
              node={root}
              depth={0}
              onClose={onClose}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
