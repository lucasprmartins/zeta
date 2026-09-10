import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { accessRoles } from "./schema/access";
import * as authSchema from "./schema/auth";
import { guides } from "./schema/guides";
import { registrationSettings } from "./schema/settings";
import { taskMentions, tasks } from "./schema/tasks";

export function createDatabase(url: string) {
  const client = new SQL(url);
  const db = drizzle({
    client,
    schema: {
      ...authSchema,
      tasks,
      taskMentions,
      guides,
      accessRoles,
      registrationSettings,
    },
  });
  return { db, close: () => client.close({ timeout: 5 }) };
}

export type DatabaseConnection = Omit<Database, "$client">;
export type Database = ReturnType<typeof createDatabase>["db"];
// A mesma interface dentro de uma transação, para repositórios que agrupam escritas.
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
