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
  ): { status: TaskFilter } => ({
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
        onFilter={(status) => {
          void navigate({ search: { status } });
        }}
        userId={data.user.id}
      />
    </PermissionBoundary>
  ) : null;
}
