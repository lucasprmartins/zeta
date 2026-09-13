import type { DomainEvent } from "../../events";
import type { Task } from "../entities/task";
import type { TaskListFilters } from "./task-list-filters";
import type { TaskUser } from "./user-directory";

// A lista alcança todas as tarefas: a autoria não restringe a consulta.
export type TaskFilter = TaskListFilters & {
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
  assigneeOptions(search: string, selected: string[]): Promise<TaskUser[]>;
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<Task | null>;
  list(filter: TaskFilter): Promise<{ items: Task[]; total: number }>;
  // Persiste tarefa e efeitos dos eventos atomicamente; falhas desfazem ambos.
  save(task: Task, events?: readonly DomainEvent[]): Promise<void>;
  // Ordenado por volume; `limit` protege o payload quando há muitas contas.
  summary(limit: number): Promise<TaskSummaryRows>;
  update(task: Task): Promise<boolean>;
}
