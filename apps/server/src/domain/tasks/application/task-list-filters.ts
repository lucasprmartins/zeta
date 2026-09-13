import type { TaskListFilters } from "../contracts/task-list-filters";
import { InvalidTaskError } from "../entities/task";

export function validateTaskFilters(input: TaskListFilters): TaskListFilters {
  if (
    input.status !== undefined &&
    input.status !== "pending" &&
    input.status !== "completed"
  ) {
    throw new InvalidTaskError("Estado inválido.");
  }
  if (
    input.search !== undefined &&
    (typeof input.search !== "string" || input.search.length > 120)
  ) {
    throw new InvalidTaskError("Busca inválida: use até 120 caracteres.");
  }
  if (input.unassigned !== undefined && typeof input.unassigned !== "boolean") {
    throw new InvalidTaskError("Filtro de responsáveis inválido.");
  }
  if (
    input.assignees !== undefined &&
    (!Array.isArray(input.assignees) ||
      input.assignees.length > 20 ||
      input.assignees.some(
        (id) => typeof id !== "string" || !id.trim() || id.length > 255
      ))
  ) {
    throw new InvalidTaskError("Informe até 20 responsáveis válidos.");
  }
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search?.trim() ? { search: input.search.trim() } : {}),
    ...(input.assignees?.length
      ? { assignees: [...new Set(input.assignees)].sort() }
      : {}),
    ...(input.unassigned ? { unassigned: true } : {}),
  };
}
