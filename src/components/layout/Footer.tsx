import Image from "next/image";
import Link from "next/link";
import {
  FacebookIcon,
  SOCIAL_URLS,
  TelegramIcon,
  VkIcon,
  YouTubeIcon,
} from "@/components/ui/SocialIcons";

const CONTACT_EMAIL = "official@anounitedworld.com";

const navLinks = [
  { href: "/category/politika-i-diplomatiya", label: "Аналитика" },
  { href: "/team", label: "Экспертиза" },
  { href: "/about", label: "О центре" },
  { href: "/sitemap-html", label: "Карта сайта" },
  { href: "/en", label: "EN" },
] as const;

export function Footer() {
  return (
    <footer className="bg-ink-deep text-white/90">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 lg:gap-12">
          {/* Колонка 1 — бренд */}
          <div className="flex flex-col gap-5">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              О центре
            </p>
            <Link href="/" className="inline-flex w-fit shrink-0">
              <Image
                src="/images/logo_1.png"
                alt="Единый Мир"
                width={80}
                height={80}
                className="h-[80px] w-[80px] object-contain"
                sizes="80px"
                unoptimized
              />
            </Link>
            <p className="max-w-sm font-sans text-[13px] leading-relaxed text-white/70">
              Автономная некоммерческая организация «Единый Мир» — аналитический
              центр, который изучает международную повестку, региональные
              процессы и глобальные вызовы современности.
            </p>
            <div className="font-sans text-[13px] leading-relaxed text-white/70">
              <span className="text-white/50">E-mail: </span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-white/85 underline decoration-white/25 underline-offset-2 transition-colors hover:text-gold-light hover:decoration-gold-light"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          {/* Колонка 2 — навигация */}
          <nav
            className="flex flex-col gap-3 font-sans text-[13px]"
            aria-label="Навигация в подвале"
          >
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Навигация
            </p>
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

          {/* Колонка 3 — подписка */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Подписка
              </p>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-white/65">
                Новости и дайджесты материалов — оставьте адрес, мы
                подготовим рассылку.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="footer-subscribe-email" className="sr-only">
                E-mail для подписки
              </label>
              <input
                id="footer-subscribe-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="E-mail"
                className="min-h-10 w-full flex-1 border border-white/15 bg-white/5 px-3 font-sans text-[13px] text-white placeholder:text-white/35 focus:border-gold-light/60 focus:outline-none focus:ring-1 focus:ring-gold-light/40"
              />
              <button
                type="button"
                className="min-h-10 shrink-0 border border-white/20 px-4 font-sans text-[12px] font-medium uppercase tracking-wide text-white/90 transition-colors hover:border-white/35 hover:bg-white/5"
              >
                Подписаться
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              <div className="flex items-center gap-4">
                <a
                  href={SOCIAL_URLS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="Telegram"
                >
                  <TelegramIcon size={20} />
                </a>
                <a
                  href={SOCIAL_URLS.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="ВКонтакте"
                >
                  <VkIcon size={20} />
                </a>
                <a
                  href={SOCIAL_URLS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="Facebook"
                >
                  <FacebookIcon size={20} />
                </a>
                <a
                  href={SOCIAL_URLS.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="YouTube"
                >
                  <YouTubeIcon size={20} />
                </a>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Вопрос%20в%20АНО%20«Единый%20Мир»`}
                className="inline-flex min-h-10 items-center justify-center bg-gold px-5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-gold-light"
              >
                Написать нам
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
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
