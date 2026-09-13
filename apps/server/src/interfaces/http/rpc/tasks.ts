import { ORPCError } from "@orpc/server";
import type { createTask } from "@server/domain/tasks/application/create-task";
import type { deleteTask } from "@server/domain/tasks/application/delete-task";
import type { getTask } from "@server/domain/tasks/application/get-task";
import type { listMentionableUsers } from "@server/domain/tasks/application/list-mentionable-users";
import type { listTaskAssignees } from "@server/domain/tasks/application/list-task-assignees";
import type { listTasks } from "@server/domain/tasks/application/list-tasks";
import type { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import type { summarizeTasks } from "@server/domain/tasks/application/summarize-tasks";
import { TaskNotFoundError } from "@server/domain/tasks/application/task-not-found";
import type { updateTask } from "@server/domain/tasks/application/update-task";
import { InvalidTaskError } from "@server/domain/tasks/entities/task";
import { can, permissions } from "@server/infrastructure/auth/access";
import { moduleProcedure, requirePermission } from "./context";
import {
  assigneeSearchInput,
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
  assignees: ReturnType<typeof listTaskAssignees>;
  create: ReturnType<typeof createTask>;
  list: ReturnType<typeof listTasks>;
  get: ReturnType<typeof getTask>;
  update: ReturnType<typeof updateTask>;
  setStatus: ReturnType<typeof setTaskStatus>;
  delete: ReturnType<typeof deleteTask>;
  mentionableUsers: ReturnType<typeof listMentionableUsers>;
  summary: ReturnType<typeof summarizeTasks>;
};
const { procedure, route } = moduleProcedure({
  tag: "Tarefas",
  translate: (error) => {
    if (error instanceof InvalidTaskError) {
      return { code: "BAD_REQUEST", message: error.message };
    }
    if (error instanceof TaskNotFoundError) {
      return { code: "NOT_FOUND", message: error.message };
    }
    return null;
  },
});

// Criar e editar não implicam indicar quem responde: é uma permissão própria.
function ensureMayMention(grants: string[], mentions: readonly string[]) {
  if (mentions.length > 0 && !can(grants, permissions.tasks.mention)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Você não tem permissão para indicar responsáveis.",
    });
  }
}

export function createTasksRouter(useCases: TaskUseCases) {
  return {
    assignees: procedure
      .use(requirePermission(permissions.tasks.read))
      .route({
        ...route,
        method: "GET",
        path: "/tasks/assignees",
        summary: "Buscar responsáveis presentes em tarefas",
      })
      .input(assigneeSearchInput)
      .output(mentionListOutput)
      .handler(({ input }) => useCases.assignees(input)),
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
    get: procedure
      .use(requirePermission(permissions.tasks.read))
      .route({
        ...route,
        method: "GET",
        path: "/tasks/{id}",
        summary: "Consultar tarefa",
      })
      .input(idInput)
      .output(taskOutput)
      .handler(({ input }) => useCases.get(input)),
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
        summary: "Buscar contas para indicar como responsável",
      })
      .input(mentionSearchInput)
      .output(mentionListOutput)
      .handler(({ input }) => useCases.mentionableUsers(input)),
  };
}
