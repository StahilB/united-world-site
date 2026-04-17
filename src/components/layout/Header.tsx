"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Section } from "@/lib/api";
import { getSectionHref } from "@/lib/navigation";
import {
  FacebookIcon,
  SOCIAL_URLS,
  TelegramIcon,
  VkIcon,
  YouTubeIcon,
} from "@/components/ui/SocialIcons";
import { HeaderSearch } from "./HeaderSearch";
import { MobileMenu } from "./MobileMenu";

/** Сжать шапку при scrollY > 150 */
const SCROLL_COLLAPSE_Y = 150;
/** Развернуть при scrollY < 50 */
const SCROLL_EXPAND_Y = 50;

/** Строки 1+2: collapse — translateY(-100%) + max-height: 0 + transition (см. ТЗ) */
const topRowsCollapsed =
  "max-h-0 -translate-y-full opacity-0 pointer-events-none";
/** Достаточно большой max-height для анимации раскрытия (контент строк 1–2) */
const topRowsExpanded = "max-h-[560px] translate-y-0 opacity-100";

const LOGO_SRC = "/logo.png";

function LogoMark({
  heightPx,
  className,
  priority,
  alt,
}: {
  heightPx: 92 | 28;
  className?: string;
  priority?: boolean;
  alt: string;
}) {
  const h = heightPx === 92 ? "h-[92px]" : "h-[28px]";
  return (
    <Image
      src={LOGO_SRC}
      alt={alt}
      width={400}
      height={heightPx}
      priority={priority}
      className={`${h} w-auto max-w-full ${className ?? ""}`}
      sizes={
        heightPx === 92
          ? "(max-width: 768px) 50vw, 320px"
          : "120px"
      }
    />
  );
}

function BurgerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const navLinkClass =
  "text-[13px] font-normal uppercase tracking-[0.05em] text-primary transition-colors duration-200 hover:text-accent";

const navSepClass = "text-[13px] text-neutral-400 select-none";

const dropLinkClass =
  "text-sm font-normal text-secondary transition-colors hover:text-primary hover:underline";

function SectionMegaPanel({ root }: { root: Section }) {
  const cols = root.children.filter((c) => c.children.length > 0);
  const leaves = root.children.filter((c) => c.children.length === 0);

  if (root.children.length === 0) return null;

  const colCount = Math.min(cols.length, 4);
  const gridColsClass =
    colCount <= 1
      ? "md:grid-cols-1"
      : colCount === 2
        ? "md:grid-cols-2"
        : colCount === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-4";

  return (
    <div className="bg-white">
      {cols.length > 0 ? (
        <div
          className={`mx-auto grid max-w-6xl gap-8 px-6 py-8 ${gridColsClass}`}
        >
          {cols.map((col) => (
            <div key={col.id}>
              <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                {col.name}
              </p>
              <ul className="space-y-2">
                {col.children.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={getSectionHref(item.slug)}
                      className={dropLinkClass}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {cols.length > 0 && leaves.length > 0 ? (
        <div className="mx-auto max-w-6xl border-t border-neutral-200" />
      ) : null}

      {leaves.length > 0 ? <MegaLeavesRow leaves={leaves} /> : null}
    </div>
  );
}

function MegaLeavesRow({ leaves }: { leaves: Section[] }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2 px-6 py-4">
      {leaves.map((l) => (
        <Link
          key={l.id}
          href={getSectionHref(l.slug)}
          className="text-xs font-semibold uppercase tracking-[0.06em] text-primary transition-colors hover:text-accent hover:underline"
        >
          {l.name}
        </Link>
      ))}
    </div>
  );
}

export type HeaderProps = {
  sections: Section[];
};

export function Header({ sections }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeRoot, setActiveRoot] = useState<Section | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Высота шапки в развёрнутом виде (1+2+3) — для spacer, не зависит от скролла */
  const [spacerHeight, setSpacerHeight] = useState(220);

  const navLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const clearNavLeaveTimer = useCallback(() => {
    if (navLeaveTimerRef.current) {
      clearTimeout(navLeaveTimerRef.current);
      navLeaveTimerRef.current = null;
    }
  }, []);

  const openRootMenu = useCallback(
    (root: Section | null) => {
      clearNavLeaveTimer();
      setActiveRoot(root);
    },
    [clearNavLeaveTimer],
  );

  const scheduleCloseNavMenu = useCallback(() => {
    clearNavLeaveTimer();
    navLeaveTimerRef.current = setTimeout(() => {
      setActiveRoot(null);
      navLeaveTimerRef.current = null;
    }, 200);
  }, [clearNavLeaveTimer]);

  useEffect(() => () => clearNavLeaveTimer(), [clearNavLeaveTimer]);

  /** Spacer = полная высота развёрнутой шапки; обновляем только в развёрнутом состоянии */
  const captureExpandedHeaderHeight = useCallback(() => {
    const el = headerRef.current;
    if (!el || isScrolledRef.current) return;
    const h = el.offsetHeight;
    if (h > 0) setSpacerHeight(h);
  }, []);

  useLayoutEffect(() => {
    captureExpandedHeaderHeight();
  }, [captureExpandedHeaderHeight]);

  useLayoutEffect(() => {
    if (isScrolled) return;
    captureExpandedHeaderHeight();
  }, [isScrolled, captureExpandedHeaderHeight, sections, activeRoot]);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!isScrolledRef.current) captureExpandedHeaderHeight();
    });
    ro.observe(el);
    window.addEventListener("resize", captureExpandedHeaderHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", captureExpandedHeaderHeight);
    };
  }, [captureExpandedHeaderHeight]);

  useEffect(() => {
    const tick = () => {
      scrollRafRef.current = null;
      const y = window.scrollY;
      let next: boolean;
      if (y > SCROLL_COLLAPSE_Y) next = true;
      else if (y < SCROLL_EXPAND_Y) next = false;
      else next = isScrolledRef.current;

      if (next !== isScrolledRef.current) {
        isScrolledRef.current = next;
        setIsScrolled(next);
      }
      setActiveRoot(null);
    };

    const onScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        tick();
      });
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/*
        fixed: шапка не меняет высоту потока — отступ задаёт spacer.
        Визуально эквивалентно sticky у верха экрана.
      */}
      <header
        ref={headerRef}
        className="fixed left-0 right-0 top-0 z-50 bg-white"
      >
        <div
          className={`overflow-hidden transition-all duration-[300ms] [transition-timing-function:ease] ${
            isScrolled ? topRowsCollapsed : topRowsExpanded
          }`}
          aria-hidden={isScrolled}
        >
          {/* Row 1 */}
          <div className="flex h-8 shrink-0 items-center justify-between bg-primary px-3 text-white md:px-6">
            <time
              dateTime="2026-04-04"
              className="text-[11px] text-white/95 md:text-xs"
            >
              4 апреля 2026
            </time>
            <div className="flex items-center gap-3 md:gap-4">
              <a
                href={SOCIAL_URLS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="Telegram"
              >
                <TelegramIcon size={16} />
              </a>
              <a
                href={SOCIAL_URLS.vk}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="ВКонтакте"
              >
                <VkIcon size={16} />
              </a>
              <a
                href={SOCIAL_URLS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="Facebook"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href={SOCIAL_URLS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="YouTube"
              >
                <YouTubeIcon size={16} />
              </a>
              <Link
                href="/support"
                className="rounded-sm bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-accentLight md:text-xs"
              >
                Поддержать
              </Link>
            </div>
          </div>

          {/* Row 2 */}
          <div className="bg-white">
            <div className="mx-auto flex max-w-6xl items-center px-3 py-2.5 md:px-6 md:py-3">
              <div className="flex min-w-0 flex-1 items-center justify-start">
                <Link href="/" className="inline-flex shrink-0">
                  <LogoMark
                    heightPx={92}
                    priority
                    alt="АНО «Единый Мир»"
                  />
                </Link>
              </div>
              <div className="mx-2 flex min-w-0 shrink flex-col items-center justify-center px-1 text-center sm:mx-4">
                <Link href="/" className="group block no-underline">
                  <span className="font-heading text-[32px] font-normal uppercase leading-tight tracking-[0.12em] text-primary">
                    ЕДИНЫЙ МИР
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted">
                    Центр мониторинга и оценки проблем современности
                  </span>
                </Link>
              </div>
              <div
                className="flex min-w-0 flex-1 items-center justify-end"
                aria-hidden
              >
                <LogoMark
                  heightPx={92}
                  alt=""
                  className="pointer-events-none opacity-0 select-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — фиксированная высота, без анимации от скролла */}
        <div
          className="relative border-y border-accent bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          onMouseLeave={scheduleCloseNavMenu}
        >
          <div className="mx-auto grid h-11 min-h-[44px] w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 md:px-6">
            <div
              className={`flex items-center justify-self-start overflow-hidden transition-all duration-[300ms] [transition-timing-function:ease] ${
                isScrolled
                  ? "max-w-[200px] opacity-100"
                  : "max-w-0 opacity-0"
              }`}
            >
              <Link
                href="/"
                aria-label="Единый мир — на главную"
                className={`inline-flex shrink-0 ${
                  isScrolled ? "pointer-events-auto" : "pointer-events-none"
                }`}
                tabIndex={isScrolled ? 0 : -1}
              >
                <LogoMark heightPx={28} alt="" />
              </Link>
            </div>

            <nav
              className="hidden items-center justify-center gap-2 md:flex"
              aria-label="Основное меню"
            >
              {sections.map((root, i) => (
                <Fragment key={root.id}>
                  {i > 0 ? <span className={navSepClass}>|</span> : null}
                  <div
                    className="relative"
                    onMouseEnter={() =>
                      openRootMenu(root.children.length > 0 ? root : null)
                    }
                  >
                    {root.slug === "en" ? (
                      <a
                        href="#"
                        className={`${navLinkClass}${activeRoot?.id === root.id ? " text-accent" : ""}`}
                        onClick={(e) => e.preventDefault()}
                        aria-current={
                          activeRoot?.id === root.id ? "true" : undefined
                        }
                      >
                        {root.name}
                      </a>
                    ) : (
                      <Link
                        href={getSectionHref(root.slug)}
                        className={`${navLinkClass}${activeRoot?.id === root.id ? " text-accent" : ""}`}
                        aria-current={
                          activeRoot?.id === root.id ? "true" : undefined
                        }
                      >
                        {root.name}
                      </Link>
                    )}
                  </div>
                </Fragment>
              ))}
            </nav>

            <div className="flex justify-self-end items-center gap-1 md:min-w-0 md:gap-2">
              <HeaderSearch />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center text-primary md:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                aria-label="Открыть меню"
                onClick={() => setMobileOpen(true)}
              >
                <BurgerIcon />
              </button>
            </div>
          </div>

          {activeRoot && activeRoot.children.length > 0 ? (
            <div
              className="absolute left-0 right-0 top-full z-[60] hidden w-full border-t-2 border-accent bg-white shadow-lg md:block"
              onMouseEnter={clearNavLeaveTimer}
            >
              <SectionMegaPanel root={activeRoot} />
            </div>
          ) : null}
        </div>
      </header>

      {/* Фиксированный отступ: контент не прыгает при сжатии строк 1–2 */}
      <div
        aria-hidden
        className="w-full shrink-0 pointer-events-none"
        style={{ height: spacerHeight }}
      />

      <div id="mobile-menu">
        <MobileMenu
          sections={sections}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </>
  );
}
