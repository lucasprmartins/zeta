import type { TaskRepository } from "../contracts/task-repository";
import { TaskNotFoundError } from "./task-not-found";

export function deleteTask(tasks: TaskRepository) {
  return async (input: { id: string }) => {
    if (!(await tasks.delete(input.id))) {
      throw new TaskNotFoundError();
    }
    return { id: input.id };
  };
}
