import { updateTask } from "@server/domain/tasks/application/update-task";
import { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import { deleteTask } from "@server/domain/tasks/application/delete-task";
import { sql } from "drizzle-orm";
import type { Env } from "./config/env";
import { createTask } from "./domain/tasks/application/create-task";
import { listTasks } from "./domain/tasks/application/list-tasks";
import { createAuthentication } from "./infrastructure/auth/better-auth";
import { createDatabase } from "./infrastructure/database/client";
import { DrizzleTaskRepository } from "./infrastructure/repositories/drizzle-task-repository";
import { createApp } from "./interfaces/http/app";
import { createRouter } from "./interfaces/http/rpc/router";

// Único ponto que conhece e conecta as implementações concretas.
export async function bootstrap(env: Env) {
  const database = createDatabase(env.databaseUrl);
  const tasks = new DrizzleTaskRepository(database.db);
  const router = createRouter({
    create: createTask({ tasks, generateId: () => crypto.randomUUID(), now: () => new Date().toISOString() }),
    list: listTasks(tasks),
    update: updateTask(tasks, () => new Date().toISOString()),
    setStatus: setTaskStatus(tasks, () => new Date().toISOString()),
    delete: deleteTask(tasks),
  });
  try {
    const app = await createApp({
      router,
      authentication: createAuthentication(database.db, env),
      checkDatabase: async () => { await database.db.execute(sql`select 1`); },
    });
    return { app, closeDatabase: database.close };
  } catch (error) {
    await database.close();
    throw error;
  }
}
