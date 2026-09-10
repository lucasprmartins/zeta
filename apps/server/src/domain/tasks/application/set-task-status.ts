import type { TaskRepository } from "../contracts/task-repository";
import { InvalidTaskError, type TaskStatus } from "../entities/task";
import { TaskNotFoundError } from "./task-not-found";

export function setTaskStatus(tasks: TaskRepository, now: () => string) {
  return async (input: { id: string; ownerId: string; status: TaskStatus }) => {
    if (input.status !== "pending" && input.status !== "completed") {
      throw new InvalidTaskError("Estado inválido.");
    }
    const task = await tasks.findById(input.id, input.ownerId);
    if (!task) {
      throw new TaskNotFoundError();
    }
    const updated =
      input.status === "completed" ? task.complete(now()) : task.reopen(now());
    if (!(await tasks.update(updated))) {
      throw new TaskNotFoundError();
    }
    return updated.toJSON();
  };
}
