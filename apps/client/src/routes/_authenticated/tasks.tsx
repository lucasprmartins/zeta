import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PermissionBoundary } from "@/components/permission-boundary";
import type { TaskFilter } from "@/features/tasks/queries";
import { TasksPage } from "@/features/tasks/tasks-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksRoute,
  staticData: { crumbs: [{ label: "Workspace" }, { label: "Tarefas" }] },
  validateSearch: (
    search: Record<string, unknown>
  ): { status: TaskFilter; task?: string | undefined } => ({
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
    (status: TaskFilter) => update({ status }),
    [update]
  );
  const openTask = useCallback((task: string) => update({ task }), [update]);
  return (
    <PermissionBoundary permission={permissions.tasks.read}>
      <TasksPage
        filter={search.status}
        onCloseTask={closeTask}
        onFilter={filterBy}
        onOpenTask={openTask}
        taskId={search.inbox ? undefined : search.task}
      />
    </PermissionBoundary>
  );
}
