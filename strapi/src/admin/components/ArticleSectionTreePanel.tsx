import * as React from "react";
import { useField, useForm } from "@strapi/admin/strapi-admin";
import { Box, Flex, Typography } from "@strapi/design-system";
import { ChevronDown, ChevronRight } from "@strapi/icons";
import { generateNKeysBetween } from "fractional-indexing";
import type { PanelComponent } from "@strapi/content-manager/strapi-admin";

const COLLECTION_TYPES = "collection-types";
const ARTICLE_UID = "api::article.article";
const FIELD_NAME = "sections";
const TARGET_MODEL = "api::section.section";
const FORM_CONSUMER = "ArticleSectionTreePanel";

type SectionApi = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  order?: number | null;
  locale?: string | null;
  parent?: { id: number } | null;
};

type TreeNode = SectionApi & { children: TreeNode[] };

function buildTree(flat: SectionApi[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  for (const s of flat) {
    byId.set(s.id, { ...s, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const s of flat) {
    const node = byId.get(s.id)!;
    const pid = s.parent?.id;
    if (pid != null && byId.has(pid)) {
      byId.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "ru"),
    );
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}

type RelationFormValue = {
  connect?: Array<{
    id: number;
    documentId?: string;
    __temp_key__?: string;
    [key: string]: unknown;
  }>;
  disconnect?: Array<{
    id: number;
    documentId?: string;
    apiData?: { id: number; documentId?: string; locale?: string | null };
  }>;
};

function getEffectiveSectionIds(
  serverIds: Set<number>,
  fieldValue: RelationFormValue | undefined,
): Set<number> {
  const initial = new Set(serverIds);
  for (const d of fieldValue?.disconnect ?? []) {
    initial.delete(d.id);
  }
  for (const c of fieldValue?.connect ?? []) {
    initial.add(c.id);
  }
  return initial;
}

function normalizeSectionsFromDocument(
  document: { sections?: unknown } | undefined,
): SectionApi[] {
  if (!document?.sections) return [];
  const raw = document.sections as unknown;
  if (Array.isArray(raw)) return raw as SectionApi[];
  if (typeof raw === "object" && raw !== null && "data" in raw) {
    const d = (raw as { data?: SectionApi[] }).data;
    return Array.isArray(d) ? d : [];
  }
  return [];
}

function SectionTreeRows({
  nodes,
  depth,
  expanded,
  toggleExpand,
  selectedIds,
  onToggleSection,
}: {
  nodes: TreeNode[];
  depth: number;
  expanded: Record<number, boolean>;
  toggleExpand: (id: number) => void;
  selectedIds: Set<number>;
  onToggleSection: (section: SectionApi, next: boolean) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = expanded[node.id] ?? depth < 1;
        return (
          <Box key={node.id}>
            <Flex
              alignItems="center"
              gap={2}
              paddingLeft={`${8 + depth * 14}px`}
              paddingTop={1}
              paddingBottom={1}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.id)}
                  aria-expanded={isOpen}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isOpen ? <ChevronDown /> : <ChevronRight />}
                </button>
              ) : (
                <span style={{ width: 24 }} />
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(node.id)}
                  onChange={(e) => {
                    onToggleSection(node, e.target.checked);
                  }}
                />
                <Typography variant="omega">{node.name}</Typography>
              </label>
            </Flex>
            {hasChildren && isOpen ? (
              <SectionTreeRows
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedIds={selectedIds}
                onToggleSection={onToggleSection}
              />
            ) : null}
          </Box>
        );
      })}
    </>
  );
}

function ArticleSectionTreeContent({
  document,
  documentId,
}: {
  document: { sections?: unknown } | undefined;
  documentId: string | undefined;
}) {
  const field = useField(FIELD_NAME);
  const removeFieldRow = useForm(FORM_CONSUMER, (s) => s.removeFieldRow);
  const addFieldRow = useForm(FORM_CONSUMER, (s) => s.addFieldRow);

  const fieldValue = field.value as RelationFormValue | undefined;

  const [tree, setTree] = React.useState<TreeNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [serverIds, setServerIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/sections?populate[0]=parent&pagination[pageSize]=100&sort[0]=order:asc`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error(`GET /api/sections ${res.status}`);
        }
        const json = (await res.json()) as { data?: SectionApi[] };
        const flat = json.data ?? [];
        if (!cancelled) {
          setTree(buildTree(flat));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const fromDoc = normalizeSectionsFromDocument(document);
    if (fromDoc.length > 0 || !documentId) {
      setServerIds(new Set(fromDoc.map((s) => s.id)));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/articles/${documentId}?populate[0]=sections`,
          { credentials: "include" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { sections?: SectionApi[] } };
        const secs = json.data?.sections ?? [];
        if (!cancelled) {
          setServerIds(new Set(secs.map((s) => s.id)));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [document, documentId]);

  const selectedIds = React.useMemo(
    () => getEffectiveSectionIds(serverIds, fieldValue),
    [serverIds, fieldValue],
  );

  const toggleExpand = React.useCallback((id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const onToggleSection = React.useCallback(
    (section: SectionApi, checked: boolean) => {
      const relation = {
        id: section.id,
        documentId: section.documentId,
        locale: section.locale ?? undefined,
      };

      const current = getEffectiveSectionIds(serverIds, field.value as RelationFormValue);

      if (checked) {
        if (current.has(section.id)) return;

        const connect = (field.value as RelationFormValue)?.connect ?? [];
        const last = connect[connect.length - 1];
        const [key] = generateNKeysBetween(
          last?.__temp_key__ ?? null,
          null,
          1,
        );

        const item = {
          id: section.id,
          apiData: {
            id: section.id,
            documentId: section.documentId,
            locale: section.locale ?? undefined,
            isTemporary: true,
          },
          __temp_key__: key,
          documentId: section.documentId,
          label: section.name,
          href: `../${COLLECTION_TYPES}/${TARGET_MODEL}/${section.documentId ?? ""}`,
        };

        field.onChange(`${FIELD_NAME}.connect`, [...connect, item]);
        return;
      }

      if (fieldValue?.connect) {
        const idx = fieldValue.connect.findIndex((rel) => rel.id === section.id);
        if (idx >= 0) {
          removeFieldRow(`${FIELD_NAME}.connect`, idx);
          return;
        }
      }

      addFieldRow(`${FIELD_NAME}.disconnect`, {
        id: relation.id,
        apiData: {
          id: relation.id,
          documentId: relation.documentId,
          locale: relation.locale ?? undefined,
        },
      });
    },
    [addFieldRow, field, fieldValue?.connect, removeFieldRow, serverIds],
  );

  if (loading) {
    return (
      <Flex justifyContent="center" paddingTop={2} paddingBottom={2}>
        <Typography variant="pi" textColor="neutral600">
          Загрузка разделов…
        </Typography>
      </Flex>
    );
  }

  if (error) {
    return (
      <Typography variant="pi" textColor="danger600">
        Не удалось загрузить разделы: {error}
      </Typography>
    );
  }

  if (tree.length === 0) {
    return (
      <Typography variant="pi" textColor="neutral600">
        Список разделов пуст.
      </Typography>
    );
  }

  return (
    <Box maxHeight="60vh" overflow="auto">
      <SectionTreeRows
        nodes={tree}
        depth={0}
        expanded={expanded}
        toggleExpand={toggleExpand}
        selectedIds={selectedIds}
        onToggleSection={onToggleSection}
      />
      <Typography tag="p" variant="pi" marginTop={3} textColor="neutral600">
        Сохраните запись, чтобы применить связи. Поле «sections» в основной форме при
        желании скройте через «Настроить вид».
      </Typography>
    </Box>
  );
}

const ArticleSectionTreePanel: PanelComponent = (props) => {
  if (props.model !== ARTICLE_UID || props.collectionType !== COLLECTION_TYPES) {
    return { title: "", content: null };
  }

  return {
    title: "Классификация (дерево разделов)",
    content: (
      <ArticleSectionTreeContent
        document={props.document}
        documentId={props.documentId}
      />
    ),
  };
};

export default ArticleSectionTreePanel;
