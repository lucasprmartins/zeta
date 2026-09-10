import { deleteTask } from "@server/domain/tasks/application/delete-task";
import { getTask } from "@server/domain/tasks/application/get-task";
import { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import { updateTask } from "@server/domain/tasks/application/update-task";
import { sql } from "drizzle-orm";
import type { Env } from "./config/env";
import { manageAccess } from "./domain/authorization/application/manage-access";
import { effectiveRoleGrants } from "./domain/authorization/entities/role";
import { manageGuides } from "./domain/guides/application/manage-guides";
import { createTask } from "./domain/tasks/application/create-task";
import { listMentionableUsers } from "./domain/tasks/application/list-mentionable-users";
import { listTasks } from "./domain/tasks/application/list-tasks";
import { summarizeTasks } from "./domain/tasks/application/summarize-tasks";
import { permissionIds } from "./infrastructure/auth/access";
import { createAuthentication } from "./infrastructure/auth/better-auth";
import { createUserManagement } from "./infrastructure/auth/manage-users";
import { createDatabase } from "./infrastructure/database/client";
import { createAccessRepository } from "./infrastructure/repositories/drizzle-access-repository";
import { createGuideRepository } from "./infrastructure/repositories/drizzle-guide-repository";
import { DrizzleTaskRepository } from "./infrastructure/repositories/drizzle-task-repository";
import { createUserDirectory } from "./infrastructure/repositories/drizzle-user-directory";
import { createApp } from "./interfaces/http/app";
import { createRouter } from "./interfaces/http/rpc/router";

// Único ponto que conhece e conecta as implementações concretas.
export async function bootstrap(env: Env) {
  const database = createDatabase(env.databaseUrl);
  const access = createAccessRepository(database.db);
  const tasks = new DrizzleTaskRepository(database.db);
  const directory = createUserDirectory(database.db);
  const router = createRouter(
    {
      create: createTask({
        tasks,
        users: directory,
        generateId: () => crypto.randomUUID(),
        now: () => new Date().toISOString(),
      }),
      list: listTasks(tasks, directory),
      get: getTask(tasks, directory),
      update: updateTask(tasks, directory, () => new Date().toISOString()),
      setStatus: setTaskStatus(tasks, directory, () =>
        new Date().toISOString()
      ),
      delete: deleteTask(tasks),
      mentionableUsers: listMentionableUsers(directory),
      summary: summarizeTasks(tasks, directory),
    },
    manageAccess(access, permissionIds, () => crypto.randomUUID()),
    createUserManagement(database.db, env),
    manageGuides(createGuideRepository(database.db), permissionIds, () =>
      new Date().toISOString()
    )
  );
  try {
    const app = await createApp({
      router,
      authentication: createAuthentication(database.db, env, async (roleId) => {
        const role = await access.role(roleId);
        return role ? effectiveRoleGrants(role, permissionIds) : [];
      }),
      checkDatabase: async () => {
        await database.db.execute(sql`select 1`);
      },
    });
    return { app, closeDatabase: database.close };
  } catch (error) {
    await database.close();
    throw error;
  }
}
