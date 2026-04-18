import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { YandexMetrica } from "@/components/analytics/YandexMetrica";
import { JsonLd } from "@/components/seo/JsonLd";
import { Footer } from "@/components/layout/Footer";
import { MigrationBanner } from "@/components/layout/MigrationBanner";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
  themeColor: "#0F1B2D",
};

export const metadata: Metadata = {
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
  alternates: {
    canonical: "/",
    languages: {
      "ru-RU": SITE_URL,
      "en-US": "https://en.anounitedworld.com",
    },
  },
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
  category: "News",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
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
        <YandexMetrica />
      </body>
    </html>
  );
}
