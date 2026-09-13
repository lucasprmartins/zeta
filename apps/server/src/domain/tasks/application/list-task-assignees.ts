import type { TaskRepository } from "../contracts/task-repository";
import { validateTaskFilters } from "./task-list-filters";

export function listTaskAssignees(tasks: TaskRepository) {
  return async (input: { search?: string; selected?: string[] }) => {
    const filters = validateTaskFilters({
      ...(input.search === undefined ? {} : { search: input.search }),
      ...(input.selected === undefined ? {} : { assignees: input.selected }),
    });
    return {
      items: await tasks.assigneeOptions(
        filters.search ?? "",
        filters.assignees ?? []
      ),
    };
  };
}
