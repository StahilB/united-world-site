import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { localizeHref } from "@/lib/i18n/types";
import {
  FacebookIcon,
  SOCIAL_URLS,
  TelegramIcon,
  VkIcon,
  YouTubeIcon,
} from "@/components/ui/SocialIcons";

const CONTACT_EMAIL = "official@anounitedworld.com";

export async function Footer() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const fdict = dict.footer;
  const year = new Date().getFullYear();
  const switchLocale = locale === "ru" ? "en" : "ru";
  const navLinks = [
    {
      href: localizeHref("/category/politika-i-diplomatiya", locale),
      label: fdict.navAnalytics,
    },
    { href: localizeHref("/team", locale), label: fdict.navExpertise },
    { href: localizeHref("/about", locale), label: fdict.navAbout },
    { href: localizeHref("/sitemap-html", locale), label: fdict.navSitemap },
    { href: localizeHref("/", switchLocale), label: fdict.navEnLink },
  ] as const;

  return (
    <footer className="bg-ink-deep text-white/90">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-10 lg:gap-12">
          {/* Колонка 1 — бренд */}
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {fdict.kickerAbout}
            </p>
            <div className="mt-5 flex flex-col gap-5">
              <Link href={localizeHref("/", locale)} className="inline-flex w-fit shrink-0">
                <Image
                  src="/images/logo_1.png"
                  alt={dict.header.siteName}
                  width={80}
                  height={80}
                  className="h-[80px] w-[80px] object-contain"
                  sizes="80px"
                  unoptimized
                />
              </Link>
              <p className="max-w-sm font-sans text-[13px] leading-relaxed text-white/70">
                {fdict.aboutDescription}
              </p>
              <div className="font-sans text-[13px] leading-relaxed text-white/70">
                <span className="text-white/50">{fdict.emailLabel} </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-white/85 underline decoration-white/25 underline-offset-2 transition-colors hover:text-gold-light hover:decoration-gold-light"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Колонка 2 — навигация */}
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {fdict.kickerNav}
            </p>
            <nav
              className="mt-5 flex flex-col gap-3 font-sans text-[13px]"
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
          </div>

          {/* Колонка 3 — подписка */}
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {fdict.kickerSubscribe}
            </p>
            <div className="mt-5 flex flex-col gap-5">
              <p className="font-sans text-[13px] leading-relaxed text-white/65">
                {fdict.subscribeText}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="footer-subscribe-email" className="sr-only">
                  {fdict.subscribePlaceholder}
                </label>
                <input
                  id="footer-subscribe-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={fdict.subscribePlaceholder}
                  className="min-h-10 w-full flex-1 border border-white/15 bg-white/5 px-3 font-sans text-[13px] text-white placeholder:text-white/35 focus:border-gold-light/60 focus:outline-none focus:ring-1 focus:ring-gold-light/40"
                />
                <button
                  type="button"
                  className="min-h-10 shrink-0 border border-white/20 px-4 font-sans text-[12px] font-medium uppercase tracking-wide text-white/90 transition-colors hover:border-white/35 hover:bg-white/5"
                >
                  {dict.common.subscribe}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-5">
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
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                    locale === "en"
                      ? "Question to United World"
                      : "Вопрос в АНО «Единый Мир»",
                  )}`}
                  className="inline-flex min-h-10 items-center justify-center bg-gold px-5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-deep transition-colors hover:bg-gold-light"
                >
                  {dict.common.writeToUs}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-sans text-[11px] leading-relaxed text-white/45">
            {fdict.copyright(year)}
          </p>
          <Link
            href={localizeHref("/privacy", locale)}
            className="w-fit font-sans text-[11px] text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70"
          >
            {fdict.privacyPolicy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
