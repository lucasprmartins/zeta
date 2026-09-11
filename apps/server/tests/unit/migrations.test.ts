import { expect, test } from "bun:test";
import { readMigrationFiles } from "drizzle-orm/migrator";

test("datas das migrations crescem para não serem ignoradas em bancos existentes", () => {
  const migrations = readMigrationFiles({
    migrationsFolder: new URL(
      "../../src/infrastructure/database/migrations",
      import.meta.url
    ).pathname,
  });
  let previous = 0;
  for (const migration of migrations) {
    expect(migration.folderMillis).toBeGreaterThan(previous);
    previous = migration.folderMillis;
  }
});
