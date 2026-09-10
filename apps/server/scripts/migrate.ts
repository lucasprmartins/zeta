import { createDatabase } from "@server/infrastructure/database/client";
import { migrateDatabase } from "@server/infrastructure/database/migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL é obrigatória para executar migrations.");
}
const database = createDatabase(url);
try {
  await migrateDatabase(database.db);
  console.info("Migrations aplicadas.");
} finally {
  await database.close();
}
