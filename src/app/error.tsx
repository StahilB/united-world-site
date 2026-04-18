"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const prev = existing?.getAttribute("content") ?? null;
    let created: HTMLMetaElement | null = null;

    if (existing) {
      existing.setAttribute("content", "noindex,follow");
    } else {
      created = document.createElement("meta");
      created.name = "robots";
      created.content = "noindex,follow";
      document.head.appendChild(created);
    }

    return () => {
      if (created) {
        created.remove();
      } else if (existing && prev) {
        existing.setAttribute("content", prev);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <h1 className="font-heading text-3xl text-ink md:text-4xl">
          Произошла ошибка
        </h1>
        <p className="mt-4 font-sans text-base text-muted">
          Мы уже знаем о проблеме и работаем над исправлением.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex rounded bg-ink px-5 py-3 font-sans text-sm font-semibold text-white transition hover:opacity-90"
        >
          Попробовать снова
        </button>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 break-words font-mono text-xs text-muted">
            {error.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
