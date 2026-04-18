"use client";

import { useEffect, useState } from "react";

const FORMATS = ["анализ", "мнение", "интервью", "колонка", "обзор"] as const;

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatch(mq.matches);
    const fn = () => setMatch(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [query]);
  return match;
}

type Option = { slug: string; name: string };

type SearchFormProps = {
  defaults: {
    q: string;
    formats: string[];
    region: string;
    category: string;
    author: string;
    dateFrom: string;
    dateTo: string;
  };
  regions: Option[];
  categories: Option[];
  authors: Option[];
};

export function SearchForm({ defaults, regions, categories, authors }: SearchFormProps) {
  const wide = useMediaQuery("(min-width: 1024px)");

  const filterFields = (
    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-4 lg:gap-y-3">
      <fieldset className="min-w-0 lg:max-w-[42%]">
        <legend className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted">
          Формат
        </legend>
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {FORMATS.map((f) => (
            <label
              key={f}
              className="inline-flex cursor-pointer items-center gap-1.5 font-sans text-[13px] text-ink"
            >
              <input
                type="checkbox"
                name="format"
                value={f}
                defaultChecked={defaults.formats.includes(f)}
                className="h-3.5 w-3.5 rounded border-ink/25 text-gold-deep focus:ring-gold"
              />
              {f}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-w-[140px] flex-col gap-1 font-sans text-[13px] text-ink">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Регион
        </span>
        <select
          name="region"
          defaultValue={defaults.region}
          className="min-h-10 border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        >
          <option value="">Все регионы</option>
          {regions.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[160px] flex-col gap-1 font-sans text-[13px] text-ink">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Тема
        </span>
        <select
          name="category"
          defaultValue={defaults.category}
          className="min-h-10 border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        >
          <option value="">Все темы</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[120px] flex-col gap-1 font-sans text-[13px] text-ink">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Дата от
        </span>
        <input
          type="date"
          name="dateFrom"
          defaultValue={defaults.dateFrom}
          className="min-h-10 border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </label>

      <label className="flex min-w-[120px] flex-col gap-1 font-sans text-[13px] text-ink">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Дата до
        </span>
        <input
          type="date"
          name="dateTo"
          defaultValue={defaults.dateTo}
          className="min-h-10 border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
      </label>

      <label className="flex min-w-[180px] flex-col gap-1 font-sans text-[13px] text-ink">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Автор
        </span>
        <select
          name="author"
          defaultValue={defaults.author}
          className="min-h-10 border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
        >
          <option value="">Все авторы</option>
          {authors.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <form method="get" action="/search" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
        <label className="min-w-0 flex-1 font-sans text-[13px] text-ink">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Запрос
          </span>
          <input
            type="search"
            name="q"
            defaultValue={defaults.q}
            placeholder="Ключевые слова в заголовке"
            className="w-full min-h-11 border border-ink/15 bg-white px-3 py-2 font-sans text-base text-ink placeholder:text-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 shrink-0 bg-ink px-6 font-sans text-[12px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-ink-soft"
        >
          Найти
        </button>
      </div>

      {wide ? (
        filterFields
      ) : (
        <details className="rounded-sm border border-ink/10 bg-surface/50">
          <summary className="cursor-pointer px-4 py-3 font-sans text-sm font-semibold text-ink">
            Фильтры
          </summary>
          <div className="border-t border-ink/10 px-4 py-4">{filterFields}</div>
        </details>
      )}
    </form>
  );
}
