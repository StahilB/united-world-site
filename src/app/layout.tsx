import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
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

export const metadata: Metadata = {
  title: "Единый Мир",
  description: "Аналитический центр",
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
      <body className={`${sourceSans3.className} min-h-full`}>
        <SiteHeader />
        {children}
        <Footer />
      </body>
    </html>
  );
}
