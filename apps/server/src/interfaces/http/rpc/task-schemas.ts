import { ORPCError, type } from "@orpc/server";
import type { JSONSchema } from "@orpc/openapi";
import type { TaskData, TaskStatus } from "@server/domain/tasks/entities/task";
import type { listTasks } from "@server/domain/tasks/application/list-tasks";
import { documented } from "@server/interfaces/http/openapi/schema";

const id: JSONSchema = { type: "string", format: "uuid" };
const title: JSONSchema = { type: "string", minLength: 1, maxLength: 120, examples: ["Revisar a documentação"] };
const description: JSONSchema = { type: "string", maxLength: 2000 };
const status: JSONSchema = { type: "string", enum: ["pending", "completed"] };
const task: JSONSchema = {
  type: "object", required: ["id", "ownerId", "title", "description", "status", "createdAt", "updatedAt", "completedAt"],
  properties: { id, ownerId: { type: "string" }, title, description, status,
    createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }, completedAt: { type: ["string", "null"], format: "date-time" } },
};
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ORPCError("BAD_REQUEST", { message: "Informe um objeto válido." });
  return input as Record<string, unknown>;
}
function text(input: unknown, field: string): string {
  if (typeof input !== "string") throw new ORPCError("BAD_REQUEST", { message: `Informe ${field} como texto.` });
  return input;
}
function parseId(input: unknown): string {
  const value = text(input, "id");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ORPCError("BAD_REQUEST", { message: "Identificador inválido." });
  return value;
}
function parseStatus(input: unknown): TaskStatus {
  if (input !== "pending" && input !== "completed") throw new ORPCError("BAD_REQUEST", { message: "Estado inválido." });
  return input;
}
export type TaskFields = { title: string; description?: string };
const fields = (input: Record<string, unknown>) => ({ title: text(input.title, "title"), description: input.description === undefined ? "" : text(input.description, "description") });
export const createInput = documented(type<TaskFields, { title: string; description: string }>((input) => fields(object(input))), {
  type: "object", required: ["title"], properties: { title, description },
});
export const updateInput = documented(type<TaskFields & { id: string }, { id: string; title: string; description: string }>((input) => { const data = object(input); return { ...fields(data), id: parseId(data.id) }; }), {
  type: "object", required: ["id", "title"], properties: { id, title, description },
});
export const statusInput = documented(type<{ id: string; status: TaskStatus }>((input) => { const data = object(input); return { id: parseId(data.id), status: parseStatus(data.status) }; }), {
  type: "object", required: ["id", "status"], properties: { id, status },
});
export const idInput = documented(type<{ id: string }>((input) => ({ id: parseId(object(input).id) })), { type: "object", required: ["id"], properties: { id } });
export const listInput = documented(type<{ status?: TaskStatus; page?: number } | undefined, { status?: TaskStatus; page: number }>((input) => {
  const data = input == null ? {} : object(input);
  const page = data.page === undefined ? 1 : typeof data.page === "string" && /^\d+$/.test(data.page) ? Number(data.page) : data.page;
  if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new ORPCError("BAD_REQUEST", { message: "Página inválida." });
  return { page, ...(data.status === undefined ? {} : { status: parseStatus(data.status) }) };
}), { type: "object", properties: { status, page: { type: "integer", minimum: 1, maximum: 1000000, default: 1 } } });
export const taskOutput = documented(type<TaskData>(), task);
export const taskListOutput = documented(type<Awaited<ReturnType<ReturnType<typeof listTasks>>>>(), {
  type: "object", required: ["items", "total", "page", "pageSize"], properties: { items: { type: "array", items: task, maxItems: 20 }, total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer", const: 20 } },
});
export const deleteOutput = documented(type<{ id: string }>(), { type: "object", required: ["id"], properties: { id } });
