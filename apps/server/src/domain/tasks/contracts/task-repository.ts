import type { Task, TaskStatus } from "../entities/task";

export type TaskFilter = {
  ownerId: string;
  status?: TaskStatus;
  limit: number;
  offset: number;
};

export interface TaskRepository {
  delete(id: string, ownerId: string): Promise<boolean>;
  findById(id: string, ownerId: string): Promise<Task | null>;
  listByOwner(filter: TaskFilter): Promise<{ items: Task[]; total: number }>;
  save(task: Task): Promise<void>;
  update(task: Task): Promise<boolean>;
}
