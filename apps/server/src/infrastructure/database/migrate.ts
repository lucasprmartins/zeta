import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import type { Database } from "./client";

// A transição do histórico precisa preceder a leitura feita pelo Drizzle.
export async function migrateDatabase(db: Database, migrationsFolder = new URL("./migrations", import.meta.url).pathname) {
  const connection = await db.$client.reserve();
  try {
    // Lock de sessão: o migrador do Drizzle abre sua própria transação.
    await connection`select pg_advisory_lock(782341902)`;
    try {
      const [history] = await connection`select to_regclass('drizzle.__drizzle_migrations') as legacy, to_regclass('drizzle.migrations') as current`;
      if (history?.legacy && history.current) throw new Error("Existem dois históricos de migrations. Revise drizzle.migrations e drizzle.__drizzle_migrations antes de continuar.");
      if (history?.legacy) await connection`alter table drizzle.__drizzle_migrations rename to migrations`;
      await migrate(drizzle({ client: connection }), { migrationsSchema: "drizzle", migrationsTable: "migrations", migrationsFolder });
    } finally { await connection`select pg_advisory_unlock(782341902)`; }
  } finally { connection.release(); }
}
