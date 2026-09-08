import { migrate } from "drizzle-orm/bun-sql/migrator";
import { createDatabase } from "@server/infrastructure/database/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL é obrigatória para executar migrations.");
const database = createDatabase(url);
try {
  await migrate(database.db, { migrationsFolder: new URL("../src/infrastructure/database/migrations", import.meta.url).pathname });
  console.info("Migrations aplicadas.");
} finally {
  await database.close();
}
