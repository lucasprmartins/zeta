import type { TaskRepository } from "../contracts/task-repository";
import { TaskNotFoundError } from "./task-not-found";

export function deleteTask(tasks: TaskRepository) {
  return async (input: { id: string; ownerId: string }) => {
    if (!(await tasks.delete(input.id, input.ownerId))) {
      throw new TaskNotFoundError();
    }
    return { id: input.id };
  };
}
