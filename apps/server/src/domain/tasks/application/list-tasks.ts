import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { InvalidTaskError, type TaskStatus } from "../entities/task";
import { toViews } from "./task-view";

export function listTasks(tasks: TaskRepository, users: UserDirectory) {
  return async (input: { status?: TaskStatus; page?: number }) => {
    const page = input.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
      throw new InvalidTaskError("Página inválida.");
    }
    if (
      input.status !== undefined &&
      input.status !== "pending" &&
      input.status !== "completed"
    ) {
      throw new InvalidTaskError("Estado inválido.");
    }
    const pageSize = 20;
    const result = await tasks.list({
      ...(input.status ? { status: input.status } : {}),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      items: await toViews(result.items, users),
      total: result.total,
      page,
      pageSize,
      // Mesmo envelope das demais listagens: o cliente não recalcula a próxima página.
      hasMore: page * pageSize < result.total,
    };
  };
}
