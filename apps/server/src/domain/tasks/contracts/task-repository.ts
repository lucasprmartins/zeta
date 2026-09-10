import type { Task, TaskStatus } from "../entities/task";

// A lista alcança todas as tarefas: a autoria não restringe mais a consulta.
export type TaskFilter = {
  status?: TaskStatus;
  limit: number;
  offset: number;
};

export type TaskCounts = { pending: number; completed: number };

// Contagens agregadas pelo banco: o resumo não cabe no tamanho de uma página.
export type TaskSummaryRows = {
  totals: TaskCounts;
  unassigned: TaskCounts;
  assignees: ({ userId: string } & TaskCounts)[];
};

export interface TaskRepository {
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<Task | null>;
  list(filter: TaskFilter): Promise<{ items: Task[]; total: number }>;
  save(task: Task): Promise<void>;
  // Ordenado por volume; `limit` protege o payload quando há muitas contas.
  summary(limit: number): Promise<TaskSummaryRows>;
  update(task: Task): Promise<boolean>;
}
