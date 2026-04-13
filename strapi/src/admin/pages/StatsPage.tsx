import { useFetchClient } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ArticleFormat = 'анализ' | 'мнение' | 'интервью' | 'колонка' | 'обзор';
type SortBy = 'date' | 'views';

type RelatedEntity = {
  id: number;
  name: string;
  slug?: string;
};

type ArticleItem = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  views_count: number;
  publication_date: string;
  format: string;
  author: RelatedEntity | null;
  region: RelatedEntity | null;
  categories: RelatedEntity[];
  hasCoverImage: boolean;
};

type FetchResponse = {
  results?: unknown[];
  data?: unknown[];
  pagination?: {
    pageCount?: number;
  };
  meta?: {
    pagination?: {
      pageCount?: number;
    };
  };
};

type MonthGroup = {
  key: string;
  label: string;
  count: number;
  views: number;
};

const CARD_BASE_STYLE: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#32324D',
  marginBottom: 16,
};

const BASE_CARD_COLORS = ['#C4A35A', '#0F1B2D', '#1E3A5F', '#4CAF50'];
const FORMAT_ORDER: ArticleFormat[] = ['анализ', 'мнение', 'интервью', 'колонка', 'обзор'];

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeRelation(value: unknown): RelatedEntity | null {
  const raw = asObject(value);
  if (!raw) return null;
  const id = asNumber(raw.id);
  if (!id) return null;

  const name = asString(raw.name) || asString(raw.title) || `#${id}`;
  return {
    id,
    name,
    slug: asString(raw.slug),
  };
}

function normalizeArticle(rawValue: unknown): ArticleItem | null {
  const raw = asObject(rawValue);
  if (!raw) return null;

  const id = asNumber(raw.id);
  if (!id) return null;

  const categoriesValue = Array.isArray(raw.categories) ? raw.categories : [];
  const coverImage = asObject(raw.cover_image);

  return {
    id,
    documentId: asString(raw.documentId) || String(id),
    title: asString(raw.title),
    slug: asString(raw.slug),
    views_count: asNumber(raw.views_count),
    publication_date: asString(raw.publication_date) || asString(raw.createdAt),
    format: asString(raw.format),
    author: normalizeRelation(raw.author),
    region: normalizeRelation(raw.region),
    categories: categoriesValue
      .map((item) => normalizeRelation(item))
      .filter((item): item is RelatedEntity => item !== null),
    hasCoverImage: Boolean(coverImage?.url),
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(value)));
}

function getMonthLabel(date: Date): string {
  const base = date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  return base ? base[0].toUpperCase() + base.slice(1) : '';
}

function groupByMonth(articles: ArticleItem[], field: 'publication_date' | 'createdAt' = 'publication_date'): MonthGroup[] {
  const now = new Date();
  const months: MonthGroup[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: getMonthLabel(d),
      count: 0,
      views: 0,
    });
  }

  for (const article of articles) {
    const value = field === 'publication_date' ? article.publication_date : '';
    if (!value) continue;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const month = months.find((item) => item.key === key);
    if (!month) continue;

    month.count += 1;
    month.views += article.views_count || 0;
  }

  return months;
}

function assignChronologicalNumbers(articles: ArticleItem[]): Map<number, number> {
  const sorted = [...articles].sort(
    (a, b) => new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime(),
  );

  const numberMap = new Map<number, number>();
  sorted.forEach((article, index) => {
    numberMap.set(article.id, index + 1);
  });

  return numberMap;
}

function buildTopMap(
  values: string[],
  limit?: number,
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) || 0) + 1);
  }

  const sorted = Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

function BarChart({ data, color, label }: { data: { month: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#32324D', marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
        {data.map((item) => (
          <div
            key={`${label}-${item.month}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{item.value > 0 ? formatNumber(item.value) : ''}</div>
            <div
              style={{
                width: '100%',
                height: `${(item.value / max) * 170}px`,
                minHeight: item.value > 0 ? 4 : 0,
                background: color,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return <div style={{ color: '#666', fontSize: 13 }}>Нет данных</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: '#32324D' }}>{item.label}</span>
            <span style={{ color: '#666', fontWeight: 600 }}>{formatNumber(item.value)}</span>
          </div>
          <div style={{ height: 8, background: '#EAEAEA', borderRadius: 4 }}>
            <div
              style={{
                height: '100%',
                width: `${(item.value / max) * 100}%`,
                background: color,
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsPage() {
  const { get } = useFetchClient();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const [search, setSearch] = useState<string>('');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [tablePage, setTablePage] = useState<number>(1);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const compactModeStorageKey = 'content-stats:compact-mode';

  const loadAllArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadingCount(0);

    try {
      const all: ArticleItem[] = [];
      let page = 1;
      let pageCount = 1;

      do {
        const response = await get('/content-manager/collection-types/api::article.article', {
          params: {
            page,
            pageSize: 100,
            sort: 'publication_date:desc',
            'populate[author]': 'true',
            'populate[region]': 'true',
            'populate[categories]': 'true',
            'populate[cover_image]': 'true',
          },
        });

        const payload = asObject(response?.data) as FetchResponse | null;
        const results = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        for (const item of results) {
          const normalized = normalizeArticle(item);
          if (normalized) {
            all.push(normalized);
          }
        }

        setLoadingCount(all.length);
        pageCount = payload?.pagination?.pageCount ?? payload?.meta?.pagination?.pageCount ?? 1;
        page += 1;
      } while (page <= pageCount);

      setArticles(all);
      setTablePage(1);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Ошибка загрузки данных';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    void loadAllArticles();
  }, [loadAllArticles]);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(compactModeStorageKey);
    if (savedValue === 'true') {
      setCompactMode(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(compactModeStorageKey, compactMode ? 'true' : 'false');
  }, [compactMode]);

  useEffect(() => {
    setTablePage(1);
  }, [search, filterFormat, filterRegion, filterAuthor, sortBy]);

  const chronologyMap = useMemo(() => assignChronologicalNumbers(articles), [articles]);

  const totalArticles = articles.length;
  const totalViews = useMemo(() => articles.reduce((acc, item) => acc + item.views_count, 0), [articles]);
  const avgViews = totalArticles ? Math.round(totalViews / totalArticles) : 0;
  const articlesLast30Days = useMemo(() => {
    const borderDate = new Date();
    borderDate.setDate(borderDate.getDate() - 30);
    return articles.filter((item) => {
      if (!item.publication_date) return false;
      const date = new Date(item.publication_date);
      return !Number.isNaN(date.getTime()) && date >= borderDate;
    }).length;
  }, [articles]);

  const monthGroups = useMemo(() => groupByMonth(articles), [articles]);
  const publicationsByMonth = useMemo(
    () => monthGroups.map((item) => ({ month: item.label, value: item.count })),
    [monthGroups],
  );
  const viewsByMonth = useMemo(
    () => monthGroups.map((item) => ({ month: item.label, value: item.views })),
    [monthGroups],
  );

  const formatStats = useMemo(
    () =>
      FORMAT_ORDER.map((format) => ({
        label: format,
        value: articles.filter((item) => item.format === format).length,
      })),
    [articles],
  );
  const regionStats = useMemo(
    () => buildTopMap(articles.map((item) => item.region?.name || ''), 10),
    [articles],
  );
  const authorStats = useMemo(
    () => buildTopMap(articles.map((item) => item.author?.name || ''), 10),
    [articles],
  );

  const regionOptions = useMemo(() => {
    const dedup = new Map<string, string>();
    for (const article of articles) {
      if (!article.region?.name) continue;
      const key = article.region.slug || String(article.region.id);
      dedup.set(key, article.region.name);
    }
    return Array.from(dedup.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru-RU'));
  }, [articles]);

  const authorOptions = useMemo(() => {
    const dedup = new Map<string, string>();
    for (const article of articles) {
      if (!article.author?.name) continue;
      dedup.set(String(article.author.id), article.author.name);
    }
    return Array.from(dedup.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru-RU'));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let next = [...articles];

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((item) => item.title.toLowerCase().includes(query));
    }

    if (filterFormat !== 'all') {
      next = next.filter((item) => item.format === filterFormat);
    }

    if (filterRegion !== 'all') {
      next = next.filter((item) => (item.region?.slug || String(item.region?.id || '')) === filterRegion);
    }

    if (filterAuthor !== 'all') {
      next = next.filter((item) => String(item.author?.id || '') === filterAuthor);
    }

    next.sort((a, b) => {
      if (sortBy === 'views') return b.views_count - a.views_count;
      return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
    });

    return next;
  }, [articles, search, filterFormat, filterRegion, filterAuthor, sortBy]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage]);

  const missingCover = useMemo(() => articles.filter((item) => !item.hasCoverImage), [articles]);
  const missingAuthor = useMemo(() => articles.filter((item) => !item.author), [articles]);
  const missingRegion = useMemo(() => articles.filter((item) => !item.region), [articles]);

  const exportCsv = useCallback(() => {
    const rows = filteredArticles.map((item, index) => {
      const orderNumber = sortBy === 'views' ? index + 1 : chronologyMap.get(item.id) || index + 1;
      const values = [
        String(orderNumber),
        item.title,
        item.author?.name || '',
        item.format || '',
        item.region?.name || '',
        formatDate(item.publication_date),
        String(item.views_count || 0),
      ].map((value) => `"${value.replace(/"/g, '""')}"`);

      return values.join(';');
    });

    const header = ['№', 'Заголовок', 'Автор', 'Формат', 'Регион', 'Дата публикации', 'Просмотры']
      .map((value) => `"${value}"`)
      .join(';');

    const csv = `\uFEFF${[header, ...rows].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'content-stats.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredArticles, chronologyMap, sortBy]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilterFormat('all');
    setFilterRegion('all');
    setFilterAuthor('all');
    setSortBy('date');
    setTablePage(1);
  }, []);

  const resetSearch = useCallback(() => {
    setSearch('');
    setTablePage(1);
  }, []);

  return (
    <div style={{ background: '#F6F6F9', minHeight: '100vh', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#32324D' }}>Статистика контента</h1>
        <button
          type="button"
          onClick={() => void loadAllArticles()}
          style={{
            padding: '8px 16px',
            borderRadius: 4,
            border: '1px solid #DCDCE4',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Обновить данные
        </button>
      </div>

      {loading && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          Загрузка данных... (загружено {formatNumber(loadingCount)} статей)
        </div>
      )}
      {error && <div style={{ background: '#FFEAEA', borderRadius: 8, padding: 16, marginBottom: 16 }}>Ошибка: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'Всего статей', icon: '📄', value: formatNumber(totalArticles) },
          { title: 'Всего просмотров', icon: '👁️', value: formatNumber(totalViews) },
          { title: 'Среднее просмотров на статью', icon: '📊', value: formatNumber(avgViews) },
          { title: 'Статей за последние 30 дней', icon: '🗓️', value: formatNumber(articlesLast30Days) },
        ].map((card, index) => (
          <div
            key={card.title}
            style={{
              ...CARD_BASE_STYLE,
              borderLeft: `4px solid ${BASE_CARD_COLORS[index] || '#C4A35A'}`,
            }}
          >
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#32324D' }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={SECTION_TITLE_STYLE}>Графики</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
        <BarChart data={publicationsByMonth} color="#C4A35A" label="Публикации по месяцам" />
        <BarChart data={viewsByMonth} color="#0F1B2D" label="Просмотры по месяцам" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#32324D', fontSize: 13 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#C4A35A', display: 'inline-block' }} />
          Публикации по месяцам
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#32324D', fontSize: 13 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#0F1B2D', display: 'inline-block' }} />
          Просмотры по месяцам
        </div>
      </div>

      <div style={SECTION_TITLE_STYLE}>Распределение контента</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#32324D', marginBottom: 16 }}>По формату</div>
          <HorizontalBars items={formatStats} color="#C4A35A" />
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#32324D', marginBottom: 16 }}>По регионам (топ-10)</div>
          <HorizontalBars items={regionStats} color="#1E3A5F" />
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#32324D', marginBottom: 16 }}>По авторам (топ-10)</div>
          <HorizontalBars items={authorStats} color="#4CAF50" />
        </div>
      </div>

      <div style={SECTION_TITLE_STYLE}>Полная таблица статей</div>
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по заголовку"
            style={{ flex: '1 1 320px', minWidth: 220, padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4 }}
          />

          <select
            value={filterFormat}
            onChange={(event) => setFilterFormat(event.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4 }}
          >
            <option value="all">Все форматы</option>
            {FORMAT_ORDER.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>

          <select
            value={filterRegion}
            onChange={(event) => setFilterRegion(event.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4 }}
          >
            <option value="all">Все регионы</option>
            {regionOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={filterAuthor}
            onChange={(event) => setFilterAuthor(event.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4 }}
          >
            <option value="all">Все авторы</option>
            {authorOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortBy('views')}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: sortBy === 'views' ? '1px solid #C4A35A' : '1px solid #DCDCE4',
              background: sortBy === 'views' ? '#C4A35A' : '#fff',
              color: sortBy === 'views' ? '#fff' : '#32324D',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            По просмотрам
          </button>
          <button
            type="button"
            onClick={() => setSortBy('date')}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: sortBy === 'date' ? '1px solid #C4A35A' : '1px solid #DCDCE4',
              background: sortBy === 'date' ? '#C4A35A' : '#fff',
              color: sortBy === 'date' ? '#fff' : '#32324D',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            По дате
          </button>

          <button
            type="button"
            onClick={exportCsv}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid #DCDCE4',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Экспорт CSV
          </button>
          <button
            type="button"
            onClick={resetSearch}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid #DCDCE4',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Сбросить поиск
          </button>
          <button
            type="button"
            onClick={resetFilters}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid #DCDCE4',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Сбросить фильтры
          </button>
          <button
            type="button"
            onClick={() => setCompactMode((prev) => !prev)}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: compactMode ? '1px solid #C4A35A' : '1px solid #DCDCE4',
              background: compactMode ? '#C4A35A' : '#fff',
              color: compactMode ? '#fff' : '#32324D',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {compactMode ? 'Обычный режим' : 'Компактный режим'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #EAEAEA' }}>
                {['№', 'Заголовок', 'Автор', 'Формат', 'Регион', 'Дата публикации', 'Просмотры'].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: compactMode ? '7px 6px' : '10px 8px',
                      color: '#32324D',
                      fontSize: compactMode ? 12 : 13,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((article, index) => {
                const number = sortBy === 'views'
                  ? (currentPage - 1) * pageSize + index + 1
                  : chronologyMap.get(article.id) || (currentPage - 1) * pageSize + index + 1;
                const views = article.views_count || 0;
                const badgeColor = views > 1000 ? '#4CAF50' : views >= 100 ? '#C4A35A' : '#8E8EA9';

                return (
                  <tr
                    key={article.id}
                    style={{
                      background: index % 2 === 0 ? '#fff' : '#F9F9F9',
                      borderBottom: '1px solid #F1F1F3',
                    }}
                  >
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', color: '#32324D', fontWeight: 600, fontSize: compactMode ? 12 : 13 }}>{number}</td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', fontSize: compactMode ? 12 : 13 }}>
                      <a
                        href={`/admin/content-manager/collection-types/api::article.article/${article.documentId}`}
                        style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {article.title || '(без заголовка)'}
                      </a>
                    </td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', color: '#32324D', fontSize: compactMode ? 12 : 13 }}>{article.author?.name || '—'}</td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', color: '#32324D', fontSize: compactMode ? 12 : 13 }}>{article.format || '—'}</td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', color: '#32324D', fontSize: compactMode ? 12 : 13 }}>{article.region?.name || '—'}</td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px', color: '#32324D', fontSize: compactMode ? 12 : 13 }}>{formatDate(article.publication_date)}</td>
                    <td style={{ padding: compactMode ? '7px 6px' : '10px 8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: compactMode ? '3px 7px' : '4px 8px',
                          borderRadius: 999,
                          background: badgeColor,
                          color: '#fff',
                          fontSize: compactMode ? 11 : 12,
                          fontWeight: 700,
                        }}
                      >
                        {formatNumber(views)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!pageItems.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                    Ничего не найдено по заданным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
            style={{ padding: '8px 14px', borderRadius: 4, border: '1px solid #DCDCE4', background: '#fff', cursor: 'pointer' }}
          >
            Назад
          </button>
          <span style={{ color: '#32324D', fontWeight: 600 }}>
            Страница {currentPage} из {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setTablePage((prev) => Math.min(totalPages, prev + 1))}
            style={{ padding: '8px 14px', borderRadius: 4, border: '1px solid #DCDCE4', background: '#fff', cursor: 'pointer' }}
          >
            Вперёд
          </button>
        </div>
      </div>

      <div style={SECTION_TITLE_STYLE}>Дополнительная аналитика</div>
      <div style={{ display: 'grid', gap: 12 }}>
        <details style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#32324D' }}>
            Статьи без обложки ({missingCover.length})
          </summary>
          <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18 }}>
            {missingCover.map((item) => (
              <li key={`cover-${item.id}`} style={{ marginBottom: 6 }}>
                <a href={`/admin/content-manager/collection-types/api::article.article/${item.documentId}`}>{item.title || '(без заголовка)'}</a>
              </li>
            ))}
            {!missingCover.length && <li>Проблем не найдено</li>}
          </ul>
        </details>

        <details style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#32324D' }}>
            Статьи без автора ({missingAuthor.length})
          </summary>
          <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18 }}>
            {missingAuthor.map((item) => (
              <li key={`author-${item.id}`} style={{ marginBottom: 6 }}>
                <a href={`/admin/content-manager/collection-types/api::article.article/${item.documentId}`}>{item.title || '(без заголовка)'}</a>
              </li>
            ))}
            {!missingAuthor.length && <li>Проблем не найдено</li>}
          </ul>
        </details>

        <details style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#32324D' }}>
            Статьи без региона ({missingRegion.length})
          </summary>
          <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18 }}>
            {missingRegion.map((item) => (
              <li key={`region-${item.id}`} style={{ marginBottom: 6 }}>
                <a href={`/admin/content-manager/collection-types/api::article.article/${item.documentId}`}>{item.title || '(без заголовка)'}</a>
              </li>
            ))}
            {!missingRegion.length && <li>Проблем не найдено</li>}
          </ul>
        </details>
      </div>
    </div>
  );
}
