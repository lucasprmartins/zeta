import type { JSONSchema } from "@orpc/openapi";
import { type } from "@orpc/server";
import type { listMentionableUsers } from "@server/domain/tasks/application/list-mentionable-users";
import type { listTasks } from "@server/domain/tasks/application/list-tasks";
import type { TaskSummary } from "@server/domain/tasks/application/summarize-tasks";
import type { TaskView } from "@server/domain/tasks/application/task-view";
import type { TaskListFilters } from "@server/domain/tasks/contracts/task-list-filters";
import {
  MAX_MENTIONS,
  type TaskStatus,
} from "@server/domain/tasks/entities/task";
import { documented } from "@server/interfaces/http/openapi/schema";
import { invalid, object, page, pageSchema, text, uuid } from "./input";

const id: JSONSchema = { type: "string", format: "uuid" };
const title: JSONSchema = {
  type: "string",
  minLength: 1,
  maxLength: 120,
  examples: ["Revisar a documentação"],
};
const description: JSONSchema = { type: "string", maxLength: 2000 };
const status: JSONSchema = { type: "string", enum: ["pending", "completed"] };
const taskUser: JSONSchema = {
  type: "object",
  required: ["id", "name", "username", "image"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    username: { type: ["string", "null"] },
    image: { type: ["string", "null"], format: "uri" },
  },
};
const mentions: JSONSchema = {
  type: "array",
  items: { type: "string" },
  maxItems: MAX_MENTIONS,
  description: "Identificadores das contas responsáveis pela tarefa.",
};
const task: JSONSchema = {
  type: "object",
  required: [
    "id",
    "authorId",
    "author",
    "title",
    "description",
    "status",
    "mentions",
    "createdAt",
    "updatedAt",
    "completedAt",
  ],
  properties: {
    id,
    authorId: { type: ["string", "null"] },
    author: { anyOf: [taskUser, { type: "null" }] },
    title,
    description,
    status,
    mentions: { type: "array", items: taskUser, maxItems: MAX_MENTIONS },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    completedAt: { type: ["string", "null"], format: "date-time" },
  },
};
function parseStatus(input: unknown): TaskStatus {
  return input === "pending" || input === "completed"
    ? input
    : invalid("Estado inválido.");
}
function parseMentions(input: unknown): string[] {
  if (input === undefined) {
    return [];
  }
  if (!Array.isArray(input) || input.length > MAX_MENTIONS) {
    invalid(`Informe até ${MAX_MENTIONS} responsáveis.`);
  }
  return input.map((value) =>
    text(value, { field: "o responsável", max: 255 })
  );
}
export type TaskFields = {
  title: string;
  description?: string;
  mentions?: string[];
};
const fields = (input: Record<string, unknown>) => ({
  title: text(input.title, { field: "o título" }),
  description:
    input.description === undefined
      ? ""
      : text(input.description, {
          field: "a descrição",
          max: 2000,
          required: false,
        }),
  mentions: parseMentions(input.mentions),
});
export const createInput = documented(
  type<TaskFields, { title: string; description: string; mentions: string[] }>(
    (input) => fields(object(input))
  ),
  {
    type: "object",
    required: ["title"],
    properties: { title, description, mentions },
  }
);
export const updateInput = documented(
  type<
    TaskFields & { id: string },
    { id: string; title: string; description: string; mentions: string[] }
  >((input) => {
    const data = object(input);
    return { ...fields(data), id: uuid(data.id) };
  }),
  {
    type: "object",
    required: ["id", "title"],
    properties: { id, title, description, mentions },
  }
);
export const statusInput = documented(
  type<{ id: string; status: TaskStatus }>((input) => {
    const data = object(input);
    return { id: uuid(data.id), status: parseStatus(data.status) };
  }),
  {
    type: "object",
    required: ["id", "status"],
    properties: { id, status },
  }
);
export const idInput = documented(
  type<{ id: string }>((input) => ({ id: uuid(object(input).id) })),
  { type: "object", required: ["id"], properties: { id } }
);
export const listInput = documented(
  type<
    (TaskListFilters & { page?: number }) | undefined,
    TaskListFilters & { page: number }
  >((input) => {
    const data = object(input ?? {});
    return {
      page: page(data.page),
      ...(data.search === undefined
        ? {}
        : {
            search: text(data.search, {
              field: "a busca",
              max: 120,
              required: false,
            }),
          }),
      ...(data.assignees === undefined
        ? {}
        : { assignees: parseMentions(data.assignees) }),
      ...(data.unassigned === undefined
        ? {}
        : {
            unassigned:
              typeof data.unassigned === "boolean"
                ? data.unassigned
                : invalid("Filtro de responsáveis inválido."),
          }),
      ...(data.status === undefined
        ? {}
        : { status: parseStatus(data.status) }),
    };
  }),
  {
    type: "object",
    properties: {
      status,
      page: pageSchema,
      search: { type: "string", maxLength: 120 },
      assignees: mentions,
      unassigned: { type: "boolean" },
    },
  }
);

export const assigneeSearchInput = documented(
  type<
    { search?: string; selected?: string[] } | undefined,
    { search: string; selected: string[] }
  >((input) => {
    const data = object(input ?? {});
    return {
      search:
        data.search === undefined
          ? ""
          : text(data.search, { field: "a busca", max: 120, required: false }),
      selected: parseMentions(data.selected),
    };
  }),
  {
    type: "object",
    properties: {
      search: { type: "string", maxLength: 120 },
      selected: mentions,
    },
  }
);
export const taskOutput = documented(type<TaskView>(), task);
export const taskListOutput = documented(
  type<Awaited<ReturnType<ReturnType<typeof listTasks>>>>(),
  {
    type: "object",
    required: ["items", "total", "page", "pageSize", "hasMore"],
    properties: {
      items: { type: "array", items: task, maxItems: 20 },
      total: { type: "integer" },
      page: { type: "integer" },
      pageSize: { type: "integer", const: 20 },
      hasMore: { type: "boolean" },
    },
  }
);
export const deleteOutput = documented(type<{ id: string }>(), {
  type: "object",
  required: ["id"],
  properties: { id },
});
export const mentionSearchInput = documented(
  type<{ search?: string } | undefined, { search: string }>((input) => {
    const data = object(input ?? {});
    return {
      search:
        data.search === undefined
          ? ""
          : text(data.search, {
              field: "a busca",
              max: 120,
              required: false,
            }),
    };
  }),
  {
    type: "object",
    properties: { search: { type: "string", maxLength: 120 } },
  }
);
export const mentionListOutput = documented(
  type<Awaited<ReturnType<ReturnType<typeof listMentionableUsers>>>>(),
  {
    type: "object",
    required: ["items"],
    properties: { items: { type: "array", items: taskUser } },
  }
);
const counts: JSONSchema = {
  type: "object",
  required: ["pending", "completed"],
  properties: {
    pending: { type: "integer", minimum: 0 },
    completed: { type: "integer", minimum: 0 },
  },
};
export const summaryOutput = documented(type<TaskSummary>(), {
  type: "object",
  required: ["total", "pending", "completed", "unassigned", "assignees"],
  properties: {
    total: { type: "integer", minimum: 0 },
    pending: { type: "integer", minimum: 0 },
    completed: { type: "integer", minimum: 0 },
    unassigned: counts,
    assignees: {
      type: "array",
      items: {
        type: "object",
        required: ["user", "pending", "completed"],
        properties: {
          user: taskUser,
          pending: { type: "integer", minimum: 0 },
          completed: { type: "integer", minimum: 0 },
        },
      },
    },
  },
});
