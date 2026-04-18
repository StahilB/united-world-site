/** Shown when Strapi is unreachable (e.g. during isolated Docker build). */
export function ArticleStrapiUnavailable() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="font-heading text-2xl text-ink">
        Сервис временно недоступен
      </h1>
      <p className="mt-4 font-sans text-text-mute">
        Не удалось загрузить материал. Попробуйте позже.
      </p>
    </main>
  );
}
