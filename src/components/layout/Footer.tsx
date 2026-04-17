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
