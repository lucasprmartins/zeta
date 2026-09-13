import type { TaskStatus } from "../entities/task";

export interface TaskListFilters {
  assignees?: string[];
  search?: string;
  status?: TaskStatus;
  unassigned?: boolean;
}
