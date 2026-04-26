import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { YandexMetrica } from "@/components/analytics/YandexMetrica";
import { MascotWidget } from "@/components/mascot/MascotWidget";
import { TextSelectionPopup } from "@/components/mascot/TextSelectionPopup";
import { JsonLd } from "@/components/seo/JsonLd";
import { Footer } from "@/components/layout/Footer";
import { MigrationBanner } from "@/components/layout/MigrationBanner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { organizationSchema, websiteSchema } from "@/lib/schema";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  weight: ["400", "700"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-source-sans-3",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://anounitedworld.com";
const IS_PRODUCTION_DOMAIN = SITE_URL.includes("anounitedworld.com");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#061739",
};

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Единый Мир — аналитический центр общественной дипломатии",
    template: "%s | Единый Мир",
  },
  description:
    "АНО «Центр мониторинга и оценки проблем современности «Единый Мир» — " +
    "независимый аналитический центр. Экспертные материалы по международной " +
    "политике, экономике, безопасности и общественной дипломатии.",
  keywords: [
    "аналитический центр",
    "международные отношения",
    "геополитика",
    "общественная дипломатия",
    "международная безопасность",
    "АНО Единый Мир",
    "международная политика",
    "аналитика",
    "экспертиза",
  ],
  authors: [{ name: "АНО «Единый Мир»", url: SITE_URL }],
  creator: "АНО «Единый Мир»",
  publisher: "АНО «Единый Мир»",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: "Единый Мир",
    title: "Единый Мир — аналитический центр общественной дипломатии",
    description:
      "Экспертные материалы по международной политике, экономике и безопасности.",
    images: [
      {
        url: "/og-default-brand.jpg",
        width: 1200,
        height: 630,
        alt: "АНО «Единый Мир»",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Единый Мир — аналитический центр",
    description: "Экспертные материалы по международной политике и общественной дипломатии",
    images: ["/og-default-brand.jpg"],
  },
  robots: IS_PRODUCTION_DOMAIN
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
      }
    : {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
      },
  verification: {
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: {
      "mailru-domain": process.env.NEXT_PUBLIC_MAILRU_VERIFICATION ?? "",
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  category: "News",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    ...baseMetadata,
    alternates: {
      canonical: locale === "en" ? "/en" : "/",
      languages: {
        ru: "/",
        en: "/en",
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale === "en" ? "en" : "ru"}
      className={`${playfairDisplay.variable} ${sourceSans3.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://admin.anounitedworld.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://admin.anounitedworld.com" />
      </head>
      <body className={`${sourceSans3.className} min-h-full`}>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <MigrationBanner />
        <SiteHeader />
        {children}
        <Footer />
        <MascotWidget />
        <TextSelectionPopup />
        <YandexMetrica />
      </body>
    </html>
  );
}
