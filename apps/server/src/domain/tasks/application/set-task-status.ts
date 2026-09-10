import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { InvalidTaskError, type TaskStatus } from "../entities/task";
import { TaskNotFoundError } from "./task-not-found";
import { toView } from "./task-view";

export function setTaskStatus(
  tasks: TaskRepository,
  users: UserDirectory,
  now: () => string
) {
  return async (input: { id: string; status: TaskStatus }) => {
    if (input.status !== "pending" && input.status !== "completed") {
      throw new InvalidTaskError("Estado inválido.");
    }
    const task = await tasks.findById(input.id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    const updated =
      input.status === "completed" ? task.complete(now()) : task.reopen(now());
    if (!(await tasks.update(updated))) {
      throw new TaskNotFoundError();
    }
    return toView(updated, users);
  };
}
