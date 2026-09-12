import { eventPublisher } from "@server/domain/events";
import {
  inbox,
  notificationsFor,
} from "@server/domain/notifications/notifications";
import { supportService } from "@server/domain/support/support";
import { deleteTask } from "@server/domain/tasks/application/delete-task";
import { getTask } from "@server/domain/tasks/application/get-task";
import { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import { updateTask } from "@server/domain/tasks/application/update-task";
import type { Transaction } from "@server/infrastructure/database/client";
import {
  createNotificationRepository,
  deliverNotifications,
} from "@server/infrastructure/repositories/drizzle-notification-repository";
import { createSupportSettings } from "@server/infrastructure/repositories/drizzle-support-settings";
import {
  createSupportWebhook,
  supportTicketId,
} from "@server/infrastructure/support/webhook";
import { createLogger, type Logger } from "@zeta/logger";
import { sql } from "drizzle-orm";
import type { Env } from "./config/env";
import { manageAccess } from "./domain/authorization/application/manage-access";
import { effectiveRoleGrants } from "./domain/authorization/entities/role";
import { manageGuides } from "./domain/guides/application/manage-guides";
import { helpService } from "./domain/help/help";
import { createTask } from "./domain/tasks/application/create-task";
import { listMentionableUsers } from "./domain/tasks/application/list-mentionable-users";
import { listTasks } from "./domain/tasks/application/list-tasks";
import { summarizeTasks } from "./domain/tasks/application/summarize-tasks";
import { streamHelp } from "./infrastructure/ai/help-model";
import { permissionIds } from "./infrastructure/auth/access";
import { createAuthentication } from "./infrastructure/auth/better-auth";
import { createUserManagement } from "./infrastructure/auth/manage-users";
import { createDatabase } from "./infrastructure/database/client";
import { createAccessRepository } from "./infrastructure/repositories/drizzle-access-repository";
import { createGuideRepository } from "./infrastructure/repositories/drizzle-guide-repository";
import { createHelpSettings } from "./infrastructure/repositories/drizzle-help-settings";
import { DrizzleTaskRepository } from "./infrastructure/repositories/drizzle-task-repository";
import { createUserDirectory } from "./infrastructure/repositories/drizzle-user-directory";
import { createApp } from "./interfaces/http/app";
import { createHelpChat } from "./interfaces/http/help-chat";
import { createRouter } from "./interfaces/http/rpc/router";

export async function bootstrap(
  env: Env,
  logger: Logger = createLogger({ service: "zeta-api", level: env.logLevel })
) {
  const database = createDatabase(env.databaseUrl);
  const access = createAccessRepository(database.db);
  const publish = eventPublisher<Transaction>([
    (event, tx) => deliverNotifications(tx, notificationsFor(event)),
  ]);
  const tasks = new DrizzleTaskRepository(database.db, publish);
  const directory = createUserDirectory(database.db);
  const guides = createGuideRepository(database.db);
  const help = helpService(
    createHelpSettings(database.db, env.authSecret),
    guides
  );
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
    manageGuides(guides, permissionIds, () => new Date().toISOString()),
    help,
    inbox(createNotificationRepository(database.db), () =>
      new Date().toISOString()
    ),
    supportService(
      createSupportSettings(database.db, env.authSecret),
      createSupportWebhook(),
      {
        origin: env.authUrl,
        now: () => new Date(),
        id: (actorId, requestId) =>
          supportTicketId(env.authUrl, actorId, requestId),
      }
    )
  );
  try {
    const authentication = createAuthentication(
      database.db,
      env,
      async (roleId) => {
        const role = await access.role(roleId);
        return role ? effectiveRoleGrants(role, permissionIds) : [];
      }
    );
    const app = await createApp({
      logger,
      router,
      authentication,
      helpChat: createHelpChat({
        service: help,
        authentication,
        trustedOrigins: env.trustedOrigins,
        stream: streamHelp,
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
