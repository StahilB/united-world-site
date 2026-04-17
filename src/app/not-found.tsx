import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <h1 className="font-heading text-4xl text-primary md:text-5xl">404</h1>
        <p className="mt-4 font-sans text-base text-muted">
          Страница не найдена или была перемещена.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded bg-primary px-5 py-3 font-sans text-sm font-semibold text-white transition hover:opacity-90"
        >
          Вернуться на главную
        </Link>
      </div>
    </main>
  );
}
