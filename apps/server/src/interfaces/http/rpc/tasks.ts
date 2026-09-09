import { permissions } from "@server/infrastructure/auth/access";
import { ORPCError } from "@orpc/server";
import type { createTask } from "@server/domain/tasks/application/create-task";
import type { listTasks } from "@server/domain/tasks/application/list-tasks";
import type { updateTask } from "@server/domain/tasks/application/update-task";
import type { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import type { deleteTask } from "@server/domain/tasks/application/delete-task";
import { TaskNotFoundError } from "@server/domain/tasks/application/task-not-found";
import { InvalidTaskError } from "@server/domain/tasks/entities/task";
import { protectedProcedure, requirePermission } from "./context";
import { createInput, updateInput, listInput, statusInput, idInput, taskOutput, taskListOutput, deleteOutput } from "./task-schemas";

export type TaskUseCases = {
  create: ReturnType<typeof createTask>;
  list: ReturnType<typeof listTasks>;
  update: ReturnType<typeof updateTask>;
  setStatus: ReturnType<typeof setTaskStatus>;
  delete: ReturnType<typeof deleteTask>;
};
const procedure = protectedProcedure.errors({ BAD_REQUEST: {}, UNAUTHORIZED: {}, FORBIDDEN: {}, NOT_FOUND: {} }).use(async ({ next }) => {
  try { return await next(); } catch (error) {
    if (error instanceof InvalidTaskError) throw new ORPCError("BAD_REQUEST", { message: error.message });
    if (error instanceof TaskNotFoundError) throw new ORPCError("NOT_FOUND", { message: error.message });
    throw error;
  }
});
const route = { tags: ["Tarefas"], spec: (operation: import("@orpc/openapi").OpenAPI.OperationObject) => ({ ...operation, security: [{ sessionCookie: [] }] }) };

export function createTasksRouter(useCases: TaskUseCases) {
  return {
    create: procedure.use(requirePermission(permissions.tasks.create)).route({ ...route, method: "POST", path: "/tasks", summary: "Criar tarefa" }).input(createInput).output(taskOutput)
      .handler(({ input, context }) => useCases.create({ ...input, ownerId: context.user.id })),
    list: procedure.use(requirePermission(permissions.tasks.read)).route({ ...route, method: "GET", path: "/tasks", summary: "Listar minhas tarefas" }).input(listInput).output(taskListOutput)
      .handler(({ input, context }) => useCases.list({ ...input, ownerId: context.user.id })),
    update: procedure.use(requirePermission(permissions.tasks.update)).route({ ...route, method: "PATCH", path: "/tasks/{id}", summary: "Editar tarefa" }).input(updateInput).output(taskOutput)
      .handler(({ input, context }) => useCases.update({ ...input, ownerId: context.user.id })),
    setStatus: procedure.use(requirePermission(permissions.tasks.setStatus)).route({ ...route, method: "PATCH", path: "/tasks/{id}/status", summary: "Concluir ou reabrir tarefa" }).input(statusInput).output(taskOutput)
      .handler(({ input, context }) => useCases.setStatus({ ...input, ownerId: context.user.id })),
    delete: procedure.use(requirePermission(permissions.tasks.delete)).route({ ...route, method: "DELETE", path: "/tasks/{id}", summary: "Excluir tarefa" }).input(idInput).output(deleteOutput)
      .handler(({ input, context }) => useCases.delete({ ...input, ownerId: context.user.id })),
  };
}
