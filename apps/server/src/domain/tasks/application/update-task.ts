import type { TaskRepository } from "../contracts/task-repository";
import { TaskNotFoundError } from "./task-not-found";

export function updateTask(tasks: TaskRepository, now: () => string) {
  return async (input: {
    id: string;
    ownerId: string;
    title: string;
    description: string;
  }) => {
    const task = await tasks.findById(input.id, input.ownerId);
    if (!task) {
      throw new TaskNotFoundError();
    }
    const updated = task.edit(
      { title: input.title, description: input.description },
      now()
    );
    if (!(await tasks.update(updated))) {
      throw new TaskNotFoundError();
    }
    return updated.toJSON();
  };
}
