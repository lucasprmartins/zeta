import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema/*.ts",
  out: "./src/infrastructure/database/migrations",
  strict: true,
  schemaFilter: ["public", "auth", "console"],
  migrations: { schema: "drizzle", table: "migrations" },
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
