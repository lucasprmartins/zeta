import type { UserManagement } from "../user-management";
import { createAccessRouter } from "./access";
import type { manageAccess } from "@server/domain/authorization/application/manage-access";
import { createTasksRouter, type TaskUseCases } from "./tasks";

export function createRouter(tasks: TaskUseCases, access?: ReturnType<typeof manageAccess>, users?: UserManagement) {
  return { tasks: createTasksRouter(tasks), access: createAccessRouter(access, users) };
}

export type AppRouter = ReturnType<typeof createRouter>;
