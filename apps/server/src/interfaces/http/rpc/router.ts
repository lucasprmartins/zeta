import type { manageAccess } from "@server/domain/authorization/application/manage-access";
import type { manageGuides } from "@server/domain/guides/application/manage-guides";
import type { HelpService } from "@server/domain/help/help";
import type { Inbox } from "@server/domain/notifications/notifications";
import type { UserManagement } from "../user-management";
import { createAccessRouter } from "./access";
import { createGuidesRouter } from "./guides";
import { createHelpRouter } from "./help";
import { createNotificationsRouter } from "./notifications";
import { createTasksRouter, type TaskUseCases } from "./tasks";

export function createRouter(
  tasks: TaskUseCases,
  access?: ReturnType<typeof manageAccess>,
  users?: UserManagement,
  guides?: ReturnType<typeof manageGuides>,
  help?: HelpService,
  notifications?: Inbox
) {
  return {
    notifications: createNotificationsRouter(notifications),
    help: createHelpRouter(help),
    guides: createGuidesRouter(guides),
    tasks: createTasksRouter(tasks),
    access: createAccessRouter(access, users),
  };
}

export type AppRouter = ReturnType<typeof createRouter>;
