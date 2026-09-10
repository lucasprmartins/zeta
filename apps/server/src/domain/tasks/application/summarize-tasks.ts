import type { TaskCounts, TaskRepository } from "../contracts/task-repository";
import type { TaskUser, UserDirectory } from "../contracts/user-directory";

// Quantas contas o painel mostra por responsável antes de virar ruído.
const TOP_ASSIGNEES = 8;

export type TaskSummary = {
  total: number;
  pending: number;
  completed: number;
  // Tarefas sem ninguém indicado; ficam de fora do recorte por responsável.
  unassigned: TaskCounts;
  assignees: ({ user: TaskUser } & TaskCounts)[];
};

export function summarizeTasks(tasks: TaskRepository, users: UserDirectory) {
  return async (): Promise<TaskSummary> => {
    const rows = await tasks.summary(TOP_ASSIGNEES);
    const known = new Map(
      (
        await users.byIds(rows.assignees.map((assignee) => assignee.userId))
      ).map((user) => [user.id, user])
    );
    return {
      total: rows.totals.pending + rows.totals.completed,
      pending: rows.totals.pending,
      completed: rows.totals.completed,
      unassigned: rows.unassigned,
      // Uma conta removida entre a contagem e a leitura simplesmente sai do recorte.
      assignees: rows.assignees.flatMap((assignee) => {
        const user = known.get(assignee.userId);
        return user
          ? [
              {
                user,
                pending: assignee.pending,
                completed: assignee.completed,
              },
            ]
          : [];
      }),
    };
  };
}
