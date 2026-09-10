import { ORPCError } from "@orpc/server";
import type { createTask } from "@server/domain/tasks/application/create-task";
import type { deleteTask } from "@server/domain/tasks/application/delete-task";
import type { listMentionableUsers } from "@server/domain/tasks/application/list-mentionable-users";
import type { listTasks } from "@server/domain/tasks/application/list-tasks";
import type { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import type { summarizeTasks } from "@server/domain/tasks/application/summarize-tasks";
import { TaskNotFoundError } from "@server/domain/tasks/application/task-not-found";
import type { updateTask } from "@server/domain/tasks/application/update-task";
import { InvalidTaskError } from "@server/domain/tasks/entities/task";
import { can, permissions } from "@server/infrastructure/auth/access";
import { protectedProcedure, requirePermission } from "./context";
import {
  createInput,
  deleteOutput,
  idInput,
  listInput,
  mentionListOutput,
  mentionSearchInput,
  statusInput,
  summaryOutput,
  taskListOutput,
  taskOutput,
  updateInput,
} from "./task-schemas";

export type TaskUseCases = {
  create: ReturnType<typeof createTask>;
  list: ReturnType<typeof listTasks>;
  update: ReturnType<typeof updateTask>;
  setStatus: ReturnType<typeof setTaskStatus>;
  delete: ReturnType<typeof deleteTask>;
  mentionableUsers: ReturnType<typeof listMentionableUsers>;
  summary: ReturnType<typeof summarizeTasks>;
};
const procedure = protectedProcedure
  .errors({ BAD_REQUEST: {}, UNAUTHORIZED: {}, FORBIDDEN: {}, NOT_FOUND: {} })
  .use(async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof InvalidTaskError) {
        throw new ORPCError("BAD_REQUEST", {
          cause: error,
          message: error.message,
        });
      }
      if (error instanceof TaskNotFoundError) {
        throw new ORPCError("NOT_FOUND", {
          cause: error,
          message: error.message,
        });
      }
      throw error;
    }
  });
const route = {
  tags: ["Tarefas"],
  spec: (operation: import("@orpc/openapi").OpenAPI.OperationObject) => ({
    ...operation,
    security: [{ sessionCookie: [] }],
  }),
};

// Criar e editar não implicam indicar contas: mencionar é uma permissão própria.
function ensureMayMention(grants: string[], mentions: readonly string[]) {
  if (mentions.length > 0 && !can(grants, permissions.tasks.mention)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Você não tem permissão para mencionar contas.",
    });
  }
}

export function createTasksRouter(useCases: TaskUseCases) {
  return {
    create: procedure
      .use(requirePermission(permissions.tasks.create))
      .route({
        ...route,
        method: "POST",
        path: "/tasks",
        summary: "Criar tarefa",
      })
      .input(createInput)
      .output(taskOutput)
      .handler(({ input, context }) => {
        ensureMayMention(context.user.grants, input.mentions);
        return useCases.create({ ...input, authorId: context.user.id });
      }),
    list: procedure
      .use(requirePermission(permissions.tasks.read))
      .route({
        ...route,
        method: "GET",
        path: "/tasks",
        summary: "Listar tarefas",
      })
      .input(listInput)
      .output(taskListOutput)
      .handler(({ input }) => useCases.list(input)),
    summary: procedure
      .use(requirePermission(permissions.tasks.read))
      .route({
        ...route,
        method: "GET",
        path: "/tasks/summary",
        summary: "Resumo das tarefas por status e responsável",
      })
      .output(summaryOutput)
      .handler(() => useCases.summary()),
    update: procedure
      .use(requirePermission(permissions.tasks.update))
      .route({
        ...route,
        method: "PATCH",
        path: "/tasks/{id}",
        summary: "Editar tarefa",
      })
      .input(updateInput)
      .output(taskOutput)
      .handler(({ input, context }) => {
        ensureMayMention(context.user.grants, input.mentions);
        return useCases.update(input);
      }),
    setStatus: procedure
      .use(requirePermission(permissions.tasks.setStatus))
      .route({
        ...route,
        method: "PATCH",
        path: "/tasks/{id}/status",
        summary: "Concluir ou reabrir tarefa",
      })
      .input(statusInput)
      .output(taskOutput)
      .handler(({ input }) => useCases.setStatus(input)),
    delete: procedure
      .use(requirePermission(permissions.tasks.delete))
      .route({
        ...route,
        method: "DELETE",
        path: "/tasks/{id}",
        summary: "Excluir tarefa",
      })
      .input(idInput)
      .output(deleteOutput)
      .handler(({ input }) => useCases.delete(input)),
    mentionableUsers: procedure
      .use(requirePermission(permissions.tasks.mention))
      .route({
        ...route,
        method: "GET",
        path: "/tasks/mentions",
        summary: "Buscar contas para mencionar",
      })
      .input(mentionSearchInput)
      .output(mentionListOutput)
      .handler(({ input }) => useCases.mentionableUsers(input)),
  };
}
