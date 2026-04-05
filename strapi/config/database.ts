import path from "path";
import type { Database } from "@strapi/types/dist/core/config/database";
import type { Core } from "@strapi/strapi";

/**
 * Local development: SQLite (Knex client `sqlite`; npm package `better-sqlite3`).
 * `__dirname` is `dist/config` when compiled — two `..` resolve to the Strapi app root.
 */
export default ({ env }: Core.Config.Shared.ConfigParams): Database<"sqlite"> => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: path.join(
        __dirname,
        "..",
        "..",
        env("DATABASE_FILENAME", ".tmp/data.db"),
      ),
    },
    useNullAsDefault: true,
  },
});
