export type TaskFilter = "all" | "pending" | "completed";

export interface TaskCriteria {
  assignees: string[];
  q: string;
  status: TaskFilter;
  unassigned: boolean;
}
export const emptyTaskCriteria: TaskCriteria = {
  status: "all",
  q: "",
  assignees: [],
  unassigned: false,
};

export function taskCriteria(input: Record<string, unknown>): TaskCriteria {
  return {
    status:
      input.status === "pending" || input.status === "completed"
        ? input.status
        : "all",
    q: typeof input.q === "string" ? input.q.trim().slice(0, 120) : "",
    assignees: Array.isArray(input.assignees)
      ? [
          ...new Set(
            input.assignees.filter(
              (id): id is string =>
                typeof id === "string" && id.length > 0 && id.length <= 255
            )
          ),
        ]
          .sort()
          .slice(0, 20)
      : [],
    unassigned: input.unassigned === true,
  };
}

export function hasTaskCriteria(criteria: TaskCriteria) {
  return (
    criteria.status !== "all" ||
    Boolean(criteria.q) ||
    criteria.assignees.length > 0 ||
    criteria.unassigned
  );
}
