import path from "path";
import type { Core } from "@strapi/strapi";
/**
 * SQLite for local dev (default), PostgreSQL when DATABASE_CLIENT=postgres (Docker / prod).
 */
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env("DATABASE_CLIENT", "sqlite");

  if (client === "postgres") {
    const cfg = {
      connection: {
        client: "postgres",
        connection: {
          host: env("DATABASE_HOST", "127.0.0.1"),
          port: env.int("DATABASE_PORT", 5432),
          database: env("DATABASE_NAME", "strapi"),
          user: env("DATABASE_USERNAME", "strapi"),
          password: env("DATABASE_PASSWORD", "strapi"),
          ssl: env.bool("DATABASE_SSL", false)
            ? {
                rejectUnauthorized: env.bool(
                  "DATABASE_SSL_REJECT_UNAUTHORIZED",
                  true,
                ),
              }
            : false,
          schema: env("DATABASE_SCHEMA", "public"),
        },
        pool: { min: 0, max: 10 },
      },
    } as Core.Config.Database;
    return cfg;
  }

  return {
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
  } as unknown as Core.Config.Database;
};
