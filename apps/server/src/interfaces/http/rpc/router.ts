import { createTasksRouter, type TaskUseCases } from "./tasks";

export function createRouter(tasks: TaskUseCases) {
  return { tasks: createTasksRouter(tasks) };
}

export type AppRouter = ReturnType<typeof createRouter>;
