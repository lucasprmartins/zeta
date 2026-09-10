import type { TaskRepository } from "../contracts/task-repository";
import { Task } from "../entities/task";

export function createTask({
  tasks,
  generateId,
  now,
}: {
  tasks: TaskRepository;
  generateId: () => string;
  now: () => string;
}) {
  return async (input: {
    ownerId: string;
    title: string;
    description: string;
  }) => {
    const task = Task.create({ ...input, id: generateId(), createdAt: now() });
    await tasks.save(task);
    return task.toJSON();
  };
}
