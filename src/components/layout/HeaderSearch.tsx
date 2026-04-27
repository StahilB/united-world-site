"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/types";
import { localizeHref } from "@/lib/i18n/types";
import { formatDateRu } from "@/lib/strapi-mappers";
import type { Article } from "@/lib/types";

function MagnifierIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.2-4.2" />
    </svg>
  );
}

type Props = {
  locale?: Locale;
  dict?: {
    searchAria?: string;
    searchPlaceholder?: string;
    searchOpenAria?: string;
    searchCloseAria?: string;
    searchLoading?: string;
    searchMinChars?: string;
    searchNoResults?: string;
    searchAdvancedLink?: string;
  };
};

export function HeaderSearch({ locale = "ru", dict }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&pageSize=10&page=1`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as { articles?: Article[] };
        setResults(json.articles ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(id);
  }, [query]);

  const onBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) setOpen(false);
  }, []);

  const openAria = dict?.searchOpenAria ?? "Открыть поиск";
  const dialogAria = dict?.searchAria ?? "Поиск по статьям";
  const closeAria = dict?.searchCloseAria ?? "Закрыть поиск";
  const placeholder = dict?.searchPlaceholder ?? "Поиск по статьям...";
  const loadingLabel = dict?.searchLoading ?? "Поиск...";
  const minCharsLabel = dict?.searchMinChars ?? "Введите не менее 3 символов";
  const noResultsLabel = dict?.searchNoResults ?? "Ничего не найдено";
  const advancedSearchLabel = dict?.searchAdvancedLink ?? "Расширенный поиск и фильтры";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-colors hover:text-gold-deep"
        aria-label={openAria}
      >
        <MagnifierIcon />
      </button>

      {open ? (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogAria}
          className="fixed inset-0 z-[200] bg-black/60"
          onMouseDown={onBackdropClick}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-[1] flex h-11 w-11 items-center justify-center rounded-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white md:right-5 md:top-5"
            aria-label={closeAria}
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

          <div
            className="mx-auto flex h-full max-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-6 pt-[min(18vh,7rem)] md:px-6 md:pb-10 md:pt-[min(22vh,9rem)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full shrink-0 border-0 border-b border-white/30 bg-transparent pb-3 font-heading text-2xl text-white outline-none placeholder:text-white/45 focus:border-white/55 md:text-[24px]"
              autoComplete="off"
            />

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <p className="font-sans text-sm text-white/60">{loadingLabel}</p>
              ) : query.trim().length > 0 && query.trim().length < 3 ? (
                <p className="font-sans text-sm text-white/60">
                  {minCharsLabel}
                </p>
              ) : results.length === 0 && query.trim().length >= 3 ? (
                <p className="font-sans text-sm text-white/60">
                  {noResultsLabel}
                </p>
              ) : (
                <ul className="space-y-1">
                  {results.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/articles/${a.slug}`}
                        className="group block rounded-sm border border-transparent px-1 py-3 transition-colors hover:border-white/15 hover:bg-white/5"
                        onClick={() => setOpen(false)}
                      >
                        <span className="font-heading text-lg text-white group-hover:text-white/95">
                          {a.title}
                        </span>
                        <span className="mt-1 block font-sans text-[13px] text-white/55">
                          {formatDateRu(a.publishedAt)} · {a.author.name}
                        </span>
                        {a.excerpt ? (
                          <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-white/70">
                            {a.excerpt}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-4 shrink-0 border-t border-white/15 pt-4 text-center font-sans text-xs text-white/55">
              <Link
                href={
                  query.trim()
                    ? `${localizeHref("/search", locale)}?q=${encodeURIComponent(query.trim())}`
                    : localizeHref("/search", locale)
                }
                className="text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
                onClick={() => setOpen(false)}
              >
                {advancedSearchLabel}
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
