import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { AdminUsersPage } from "@/features/access/admin-users-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersRoute,
  staticData: { crumbs: [{ label: "Administração" }, { label: "Usuários" }] },
  validateSearch: (
    search: Record<string, unknown>
  ): { q?: string; view?: "roles" | "approvals" } => ({
    ...(search.view === "roles" || search.view === "approvals"
      ? { view: search.view }
      : {}),
    ...(typeof search.q === "string" &&
    search.q.trim() &&
    search.q.length <= 254
      ? { q: search.q.trim() }
      : {}),
  }),
});

function AdminUsersRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PermissionBoundary permission={permissions.access.manage}>
      <AdminUsersPage
        onSearch={(q) => {
          void navigate({ search: q ? { q } : {} });
        }}
        search={search.q ?? ""}
        view={search.view ?? "users"}
      />
    </PermissionBoundary>
  );
}
