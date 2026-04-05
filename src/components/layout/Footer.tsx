import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "official@anounitedworld.com";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.21.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function VkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.174-1.744-1.174-.358 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.674 4.03 8.55 4.03 8.088c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.049 2.303 3.845 2.896 3.845.22 0 .322-.102.322-.66V9.721c-.068-1.184-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.78 0 1.084.424 1.084 1.389v3.845c0 .745.339 1.084.542 1.084.22 0 .407-.135.813-.542 1.253-1.389 2.15-3.52 2.15-3.52.254-.508.508-.745 1.084-.745h1.744c1.117 0 1.355.559 1.084 1.321-.254.813-2.15 3.117-2.15 3.117-.254.339-.339.508 0 .922.254.339 1.084 1.084 1.084 1.084z" />
    </svg>
  );
}

const navLinks = [
  { href: "/category/politika-i-diplomatiya", label: "Аналитика" },
  { href: "/team", label: "Экспертиза" },
  { href: "/about", label: "О центре" },
  { href: "/en", label: "EN" },
] as const;

export function Footer() {
  return (
    <footer className="bg-[#0F1B2D] text-white/90">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-12 lg:gap-16">
          {/* Колонка 1 */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="inline-flex w-fit shrink-0">
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/90 p-3">
                <Image
                  src="/images/logo_1.png"
                  alt="Единый Мир"
                  width={96}
                  height={96}
                  className="max-h-full max-w-full object-contain"
                  sizes="96px"
                  unoptimized
                />
              </div>
            </Link>
            <p className="max-w-sm font-sans text-[13px] leading-relaxed text-white/70">
              Автономная некоммерческая организация «Единый Мир» — аналитический
              центр, который изучает международную повестку, региональные процессы
              и глобальные вызовы современности.
            </p>
            <div className="font-sans text-[13px] leading-relaxed text-white/70">
              <span className="text-white/50">E-mail: </span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-white/85 underline decoration-white/25 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Колонка 2 */}
          <nav
            className="flex flex-col gap-3 font-sans text-[13px]"
            aria-label="Навигация в подвале"
          >
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="w-fit text-white/75 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Колонка 3 */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Подписка
              </p>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/65">
                Новости и дайджесты материалов — оставьте адрес, мы подготовим
                рассылку.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="footer-subscribe-email" className="sr-only">
                  E-mail для подписки
                </label>
                <input
                  id="footer-subscribe-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="E-mail"
                  className="min-h-10 w-full flex-1 border border-white/15 bg-white/5 px-3 font-sans text-[13px] text-white placeholder:text-white/35 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
                />
                <button
                  type="button"
                  className="min-h-10 shrink-0 border border-white/20 px-4 font-sans text-[12px] font-medium uppercase tracking-wide text-white/90 transition-colors hover:border-white/35 hover:bg-white/5"
                >
                  Подписаться
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="Telegram"
                >
                  <TelegramIcon />
                </a>
                <a
                  href="https://vk.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="ВКонтакте"
                >
                  <VkIcon />
                </a>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Вопрос%20в%20АНО%20«Единый%20Мир»`}
                className="inline-flex min-h-10 items-center justify-center bg-accent px-5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-accentLight"
              >
                Написать нам
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="font-sans text-[11px] leading-relaxed text-white/45">
            © 2024-2026 АНО «Единый Мир»
          </p>
          <Link
            href="/privacy"
            className="w-fit font-sans text-[11px] text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}
