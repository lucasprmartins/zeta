import type { Task, TaskStatus } from "../entities/task";

// A lista alcança todas as tarefas: a autoria não restringe mais a consulta.
export type TaskFilter = {
  status?: TaskStatus;
  limit: number;
  offset: number;
};

export interface TaskRepository {
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<Task | null>;
  list(filter: TaskFilter): Promise<{ items: Task[]; total: number }>;
  save(task: Task): Promise<void>;
  update(task: Task): Promise<boolean>;
}
