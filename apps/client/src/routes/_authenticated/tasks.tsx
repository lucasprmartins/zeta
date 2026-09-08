import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "@/features/tasks/tasks-page";
import type { TaskFilter } from "@/features/tasks/queries";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksRoute,
  validateSearch: (search: Record<string, unknown>): { status: TaskFilter } => ({
    status: search.status === "pending" || search.status === "completed" ? search.status : "all",
  }),
});

function TasksRoute() {
  const { data } = authClient.useSession();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return data ? <TasksPage key={data.user.id} userId={data.user.id} filter={search.status}
    onFilter={(status) => { void navigate({ search: { status } }); }}
    /> : null;
}
