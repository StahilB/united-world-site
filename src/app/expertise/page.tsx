import Link from "next/link";

export default function ExpertiseHubPage() {
  return (
    <main className="min-h-screen bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal tracking-tight text-ink md:text-4xl">
          Экспертиза
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-base text-secondary">
          Мнения экспертов, интервью и авторские колонки.
        </p>
        <ul className="mt-10 space-y-4 font-sans text-lg">
          <li>
            <Link
              href="/expertise/opinions"
              className="text-accent underline-offset-4 hover:underline"
            >
              Мнения
            </Link>
          </li>
          <li>
            <Link
              href="/expertise/interviews"
              className="text-accent underline-offset-4 hover:underline"
            >
              Интервью
            </Link>
          </li>
          <li>
            <Link
              href="/expertise/columns"
              className="text-accent underline-offset-4 hover:underline"
            >
              Авторские колонки
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
