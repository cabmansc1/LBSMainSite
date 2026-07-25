import { defineConfig } from "drizzle-kit";

/**
 * Points at the SAME MySQL database the PHP site uses.
 * Run `npx drizzle-kit pull` against staging to introspect the full
 * legacy schema; src/lib/db/schema.ts holds the tables the new app owns.
 */
export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASS ?? "",
    database: process.env.DB_NAME ?? "",
  },
});
