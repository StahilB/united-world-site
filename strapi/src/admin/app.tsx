import type { StrapiApp } from "@strapi/strapi/admin";

import ArticleSectionTreePanel from "./components/ArticleSectionTreePanel";

/**
 * Расширение админки Strapi 5.
 *
 * Панель «Классификация (дерево разделов)» добавляет удобный выбор Section для Article.
 * Стандартное relation-поле `sections` можно скрыть или перенести вниз через
 * Content Manager → Article → «Настроить вид» (Configure the view).
 */
export default {
  config: {
    locales: ["ru"],
  },
  bootstrap(app: StrapiApp) {
    const cm = app.getPlugin("content-manager") as {
      apis?: {
        addEditViewSidePanel?: (
          panels:
            | Array<{ name: string; Component: unknown }>
            | ((prev: unknown[]) => unknown[]),
        ) => void;
      };
    };
    cm.apis?.addEditViewSidePanel?.((panels: unknown[]) => {
      const list = Array.isArray(panels) ? panels : [];
      const without = list.filter(
        (p: { name?: string }) => p?.name !== "united-world.article-section-tree",
      );
      return [
        {
          name: "united-world.article-section-tree",
          Component: ArticleSectionTreePanel,
        },
        ...without,
      ];
    });
  },
};
