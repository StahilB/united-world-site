"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MegaMenu } from "./MegaMenu";
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

const LOGO_SRC = "/images/logo_1.png";

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

function TelegramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.21.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function VkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.174-1.744-1.174-.358 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.674 4.03 8.55 4.03 8.088c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.049 2.303 3.845 2.896 3.845.22 0 .322-.102.322-.66V9.721c-.068-1.184-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.78 0 1.084.424 1.084 1.389v3.845c0 .745.339 1.084.542 1.084.22 0 .407-.135.813-.542 1.253-1.389 2.15-3.52 2.15-3.52.254-.508.508-.745 1.084-.745h1.744c1.117 0 1.355.559 1.084 1.321-.254.813-2.15 3.117-2.15 3.117-.254.339-.339.508 0 .922.254.339 1.084 1.084 1.084 1.084z" />
    </svg>
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

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Высота шапки в развёрнутом виде (1+2+3) — для spacer, не зависит от скролла */
  const [spacerHeight, setSpacerHeight] = useState(220);

  const megaLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expertiseLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const clearMegaLeaveTimer = useCallback(() => {
    if (megaLeaveTimerRef.current) {
      clearTimeout(megaLeaveTimerRef.current);
      megaLeaveTimerRef.current = null;
    }
  }, []);

  const clearExpertiseLeaveTimer = useCallback(() => {
    if (expertiseLeaveTimerRef.current) {
      clearTimeout(expertiseLeaveTimerRef.current);
      expertiseLeaveTimerRef.current = null;
    }
  }, []);

  const openMegaMenu = useCallback(() => {
    clearMegaLeaveTimer();
    setMegaOpen(true);
  }, [clearMegaLeaveTimer]);

  const scheduleCloseMegaMenu = useCallback(() => {
    clearMegaLeaveTimer();
    megaLeaveTimerRef.current = setTimeout(() => {
      setMegaOpen(false);
      megaLeaveTimerRef.current = null;
    }, 200);
  }, [clearMegaLeaveTimer]);

  useEffect(() => () => clearMegaLeaveTimer(), [clearMegaLeaveTimer]);

  const openExpertiseMenu = useCallback(() => {
    clearExpertiseLeaveTimer();
    setExpertiseOpen(true);
  }, [clearExpertiseLeaveTimer]);

  const scheduleCloseExpertiseMenu = useCallback(() => {
    clearExpertiseLeaveTimer();
    expertiseLeaveTimerRef.current = setTimeout(() => {
      setExpertiseOpen(false);
      expertiseLeaveTimerRef.current = null;
    }, 200);
  }, [clearExpertiseLeaveTimer]);

  useEffect(() => () => clearExpertiseLeaveTimer(), [clearExpertiseLeaveTimer]);

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
  }, [isScrolled, captureExpandedHeaderHeight]);

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
      setMegaOpen(false);
      setExpertiseOpen(false);
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
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="Telegram"
              >
                <TelegramIcon />
              </a>
              <a
                href="https://vk.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-opacity hover:opacity-80"
                aria-label="ВКонтакте"
              >
                <VkIcon />
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
        <div className="relative border-y border-accent bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
              <div
                className="relative"
                onMouseEnter={openMegaMenu}
                onMouseLeave={scheduleCloseMegaMenu}
              >
                <Link
                  href="/articles"
                  className={`${navLinkClass}${megaOpen ? " text-accent" : ""}`}
                  aria-current={megaOpen ? "true" : undefined}
                >
                  Аналитика
                </Link>
              </div>
              <span className={navSepClass}>|</span>
              <div
                className="relative"
                onMouseEnter={openExpertiseMenu}
                onMouseLeave={scheduleCloseExpertiseMenu}
              >
                <Link
                  href="/expertise"
                  className={`${navLinkClass}${expertiseOpen ? " text-accent" : ""}`}
                  aria-current={expertiseOpen ? "true" : undefined}
                >
                  Экспертиза
                </Link>

                {expertiseOpen && (
                  <div className="absolute left-0 right-0 top-full z-[60] hidden w-[260px] border-t-2 border-accent bg-white shadow-lg md:block">
                    <div className="px-4 py-4">
                      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        ЭКСПЕРТИЗА
                      </p>
                      <ul className="space-y-2">
                        <li>
                          <Link
                            href="/expertise/opinions"
                            className="text-sm font-normal text-secondary transition-colors hover:text-primary hover:underline"
                          >
                            Мнения
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/expertise/interviews"
                            className="text-sm font-normal text-secondary transition-colors hover:text-primary hover:underline"
                          >
                            Интервью
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/expertise/columns"
                            className="text-sm font-normal text-secondary transition-colors hover:text-primary hover:underline"
                          >
                            Авторские колонки
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <span className={navSepClass}>|</span>
              <Link href="/about" className={navLinkClass}>
                О центре
              </Link>
              <span className={navSepClass}>|</span>
              <Link href="/en" className={navLinkClass}>
                EN
              </Link>
            </nav>

            <div className="justify-self-end md:min-w-0">
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

          {megaOpen && (
            <div
              className="absolute left-0 right-0 top-full z-[60] hidden w-full border-t-2 border-accent bg-white shadow-lg md:block"
              onMouseEnter={openMegaMenu}
              onMouseLeave={scheduleCloseMegaMenu}
            >
              <MegaMenu />
            </div>
          )}
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
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </>
  );
}
