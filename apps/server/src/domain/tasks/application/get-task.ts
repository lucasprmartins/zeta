import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { TaskNotFoundError } from "./task-not-found";
import { toView } from "./task-view";

export function getTask(tasks: TaskRepository, users: UserDirectory) {
  return async ({ id }: { id: string }) => {
    const task = await tasks.findById(id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    return toView(task, users);
  };
}
