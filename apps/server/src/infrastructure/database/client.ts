import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as authSchema from "./schema/auth";
import { tasks } from "./schema/tasks";

export function createDatabase(url: string) {
  const client = new SQL(url);
  const db = drizzle({ client, schema: { ...authSchema, tasks } });
  return { db, close: () => client.close({ timeout: 5 }) };
}

export type Database = ReturnType<typeof createDatabase>["db"];
