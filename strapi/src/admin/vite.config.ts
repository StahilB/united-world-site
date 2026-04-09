import { mergeConfig, type UserConfig } from "vite";

/**
 * Локальная кастомизация сборки админки (алиасы и т.д.).
 * Скопировано из vite.config.example.ts — Strapi подхватывает этот файл автоматически.
 */
export default (config: UserConfig) =>
  mergeConfig(config, {
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  });
