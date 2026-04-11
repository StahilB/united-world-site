import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Flex,
  Typography,
  TextInput,
} from '@strapi/design-system';
import { unstable_useContentManagerContext, useFetchClient } from '@strapi/strapi/admin';

type SectionRow = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  order?: number | null;
  parent?: { id: number } | null;
};

function parseStoredIds(value: unknown): number[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(Number).filter((n) => Number.isFinite(n));
  }
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p.map(Number).filter((n) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function extractRelationIds(sections: unknown): number[] {
  if (sections == null) return [];
  if (Array.isArray(sections)) {
    const out: number[] = [];
    for (const item of sections) {
      if (typeof item === 'object' && item && 'id' in item) {
        const id = Number((item as { id: unknown }).id);
        if (Number.isFinite(id)) out.push(id);
      }
    }
    return out;
  }
  return [];
}

function sortSections(a: SectionRow, b: SectionRow): number {
  const oa = a.order ?? 0;
  const ob = b.order ?? 0;
  if (oa !== ob) return oa - ob;
  return a.name.localeCompare(b.name, 'ru');
}

function buildChildrenMap(rows: SectionRow[]): Map<number | null, SectionRow[]> {
  const map = new Map<number | null, SectionRow[]>();
  for (const s of rows) {
    const pid = s.parent?.id ?? null;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(s);
  }
  for (const arr of map.values()) {
    arr.sort(sortSections);
  }
  return map;
}

function collectVisibleIds(
  rows: SectionRow[],
  query: string,
): Set<number> | null {
  if (!query.trim()) return null;
  const q = query.toLowerCase().trim();
  const match = new Set<number>();
  for (const s of rows) {
    if (s.name.toLowerCase().includes(q)) match.add(s.id);
  }
  const parentOf = new Map<number, number | null>();
  for (const s of rows) {
    parentOf.set(s.id, s.parent?.id ?? null);
  }
  const visible = new Set<number>(match);
  for (const id of match) {
    let p = parentOf.get(id);
    while (p != null) {
      visible.add(p);
      p = parentOf.get(p) ?? null;
    }
  }
  function addDesc(id: number) {
    for (const s of rows) {
      if (s.parent?.id === id) {
        visible.add(s.id);
        addDesc(s.id);
      }
    }
  }
  for (const id of [...match]) addDesc(id);
  return visible;
}

type InputProps = {
  name: string;
  value: unknown;
  onChange: (e: {
    target: { name: string; value: unknown; type: string };
  }) => void;
  attribute?: { required?: boolean };
  error?: string;
};

export function SectionTreeInput({
  name,
  value,
  onChange,
  error,
}: InputProps) {
  const { get } = useFetchClient();
  const cm = unstable_useContentManagerContext();
  const form = cm.form as { watch?: (name: string) => unknown } | undefined;
  const sectionsVal = form?.watch ? form.watch('sections') : undefined;
  const relationIds = useMemo(
    () => extractRelationIds(sectionsVal),
    [sectionsVal],
  );
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const manualIds = useMemo(() => parseStoredIds(value), [value]);
  const manualSet = useMemo(() => new Set(manualIds), [manualIds]);

  const autoOnlyIds = useMemo(
    () => relationIds.filter((id) => !manualSet.has(id)),
    [relationIds, manualSet],
  );

  const autoOnlySet = useMemo(() => new Set(autoOnlyIds), [autoOnlyIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setLoadError(null);
      const acc: SectionRow[] = [];
      try {
        let page = 1;
        let pageCount = 1;
        do {
          const { data } = await get(
            '/content-manager/collection-types/api::section.section',
            {
              params: {
                page,
                pageSize: 100,
                sort: 'order:asc',
              },
            },
          );
          const list = data?.results ?? data?.data ?? [];
          for (const item of list) {
            const flat =
              item.attributes != null
                ? { id: item.id, documentId: item.documentId, ...item.attributes }
                : item;
            acc.push({
              id: flat.id,
              documentId: flat.documentId,
              name: flat.name ?? '',
              slug: flat.slug ?? '',
              order: flat.order ?? 0,
              parent:
                flat.parent?.id != null
                  ? { id: flat.parent.id }
                  : typeof flat.parent === 'number'
                    ? { id: flat.parent }
                    : null,
            });
          }
          pageCount =
            data?.pagination?.pageCount ?? data?.meta?.pagination?.pageCount ?? 1;
          page += 1;
        } while (page <= pageCount);
        if (!cancelled) {
          acc.sort(sortSections);
          setRows(acc);
          const childMap = buildChildrenMap(acc);
          const exp = new Set<number>();
          for (const s of acc) {
            if (!s.parent?.id && (childMap.get(s.id)?.length ?? 0) > 0) {
              exp.add(s.id);
            }
          }
          setExpanded(exp);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Load failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [get]);

  const childrenMap = useMemo(() => buildChildrenMap(rows), [rows]);
  const visibleFilter = useMemo(
    () => collectVisibleIds(rows, search),
    [rows, search],
  );

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setManualIds = useCallback(
    (ids: number[]) => {
      onChange({
        target: {
          name,
          value: ids,
          type: 'json',
        },
      });
    },
    [name, onChange],
  );

  const toggleId = useCallback(
    (id: number, checked: boolean, isAutoOnly: boolean) => {
      if (isAutoOnly) return;
      const next = new Set(manualIds);
      if (checked) next.add(id);
      else next.delete(id);
      setManualIds([...next]);
    },
    [manualIds, setManualIds],
  );

  const roots = childrenMap.get(null) ?? [];

  const renderNode = (node: SectionRow, level: number): React.ReactNode => {
    if (visibleFilter && !visibleFilter.has(node.id)) return null;
    const kids = childrenMap.get(node.id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = expanded.has(node.id);
    const isAutoOnly = autoOnlySet.has(node.id) && !manualSet.has(node.id);
    const checked = manualSet.has(node.id) || isAutoOnly;
    const pad = level * 24;

    return (
      <Box key={node.id}>
        <Flex
          alignItems="center"
          paddingLeft={`${pad}px`}
          paddingTop={1}
          paddingBottom={1}
          gap={2}
        >
          {hasKids ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: 24,
                fontSize: 12,
              }}
              aria-expanded={isOpen}
            >
              {isOpen ? '▼' : '▶'}
            </button>
          ) : (
            <span style={{ width: 24, display: 'inline-block' }} />
          )}
          <Checkbox
            checked={checked}
            disabled={isAutoOnly}
            onCheckedChange={(v: boolean | 'indeterminate') => {
              if (v === 'indeterminate') return;
              toggleId(node.id, Boolean(v), isAutoOnly);
            }}
          />
          <Typography as="span">{node.name}</Typography>
          {isAutoOnly ? (
            <Typography variant="pi" textColor="neutral500">
              (авто)
            </Typography>
          ) : null}
        </Flex>
        {hasKids && isOpen
          ? kids.map((ch) => renderNode(ch, level + 1))
          : null}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box padding={3}>
        <Typography>Загрузка рубрик…</Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box padding={3}>
        <Typography textColor="danger600">{loadError}</Typography>
      </Box>
    );
  }

  return (
    <Box
      background="neutral0"
      borderColor="neutral200"
      borderStyle="solid"
      borderWidth="1px"
      borderRadius="4px"
      padding={3}
      maxHeight="400px"
      overflow="auto"
    >
      <Box marginBottom={3}>
        <TextInput
          placeholder="Поиск по названию…"
          name={`${name}_search`}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          size="S"
        />
      </Box>
      {error ? (
        <Typography textColor="danger600" marginBottom={2}>
          {error}
        </Typography>
      ) : null}
      {roots.map((r) => renderNode(r, 0))}
    </Box>
  );
}
