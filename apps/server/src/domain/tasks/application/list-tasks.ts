import type { TaskRepository } from "../contracts/task-repository";
import { InvalidTaskError, type TaskStatus } from "../entities/task";

export function listTasks(tasks: TaskRepository) {
  return async (input: { ownerId: string; status?: TaskStatus; page?: number }) => {
    const page = input.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new InvalidTaskError("Página inválida.");
    if (input.status !== undefined && input.status !== "pending" && input.status !== "completed") throw new InvalidTaskError("Estado inválido.");
    const pageSize = 20;
    const result = await tasks.listByOwner({ ownerId: input.ownerId, ...(input.status ? { status: input.status } : {}), limit: pageSize, offset: (page - 1) * pageSize });
    return { items: result.items.map((task) => task.toJSON()), total: result.total, page, pageSize };
  };
}
