import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import type { TaskFilter } from "@/features/tasks/queries";
import { TasksPage } from "@/features/tasks/tasks-page";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";

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
  const { data } = authClient.useSession();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return data ? (
    <PermissionBoundary permission={permissions.tasks.read}>
      <TasksPage
        filter={search.status}
        key={data.user.id}
        onCloseTask={() => {
          void navigate({
            search: (previous) => ({ ...previous, task: undefined }),
            resetScroll: false,
          });
        }}
        onFilter={(status) => {
          void navigate({
            search: (previous) => ({ ...previous, status }),
            resetScroll: false,
          });
        }}
        onOpenTask={(task) => {
          void navigate({
            search: (previous) => ({ ...previous, task }),
            resetScroll: false,
          });
        }}
        taskId={search.task}
        userId={data.user.id}
      />
    </PermissionBoundary>
  ) : null;
}
