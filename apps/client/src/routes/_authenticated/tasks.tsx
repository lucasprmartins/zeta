import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PermissionBoundary } from "@/components/permission-boundary";
import type { TaskFilter } from "@/features/tasks/queries";
import { type TaskCriteria, taskCriteria } from "@/features/tasks/task-filters";
import { TasksPage } from "@/features/tasks/tasks-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksRoute,
  staticData: { crumbs: [{ label: "Workspace" }, { label: "Tarefas" }] },
  validateSearch: (
    search: Record<string, unknown>
  ): {
    status: TaskFilter;
    task?: string | undefined;
    q?: string;
    assignees?: string[];
    unassigned?: boolean;
  } => ({
    ...taskCriteria(search),
    task:
      typeof search.task === "string" &&
      search.task.length > 0 &&
      search.task.length <= 255
        ? search.task
        : undefined,
    status:
      search.status === "pending" || search.status === "completed"
        ? search.status
        : "all",
  }),
});

function TasksRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const update = useCallback(
    (next: { status?: TaskFilter; task?: string | undefined }) => {
      void navigate({
        search: (previous) => ({ ...previous, ...next }),
        resetScroll: false,
      });
    },
    [navigate]
  );
  const closeTask = useCallback(() => update({ task: undefined }), [update]);
  const filterBy = useCallback(
    (criteria: TaskCriteria) => {
      void navigate({
        search: (previous) => ({ ...previous, ...criteria }),
        replace:
          criteria.q !== (search.q ?? "") &&
          criteria.status === search.status &&
          JSON.stringify(criteria.assignees) ===
            JSON.stringify(search.assignees ?? []) &&
          criteria.unassigned === (search.unassigned ?? false),
        resetScroll: false,
      });
    },
    [navigate, search]
  );
  const openTask = useCallback((task: string) => update({ task }), [update]);
  return (
    <PermissionBoundary permission={permissions.tasks.read}>
      <TasksPage
        criteria={taskCriteria(search)}
        onCloseTask={closeTask}
        onCriteria={filterBy}
        onOpenTask={openTask}
        taskId={search.inbox ? undefined : search.task}
      />
    </PermissionBoundary>
  );
}
