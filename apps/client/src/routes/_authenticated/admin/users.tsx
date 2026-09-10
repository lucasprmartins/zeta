import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { AdminUsersPage } from "@/features/access/admin-users-page";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/admin/users")({
  component: Page,
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
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = authClient.useSession();
  return data ? (
    <PermissionBoundary permission={permissions.access.manage}>
      <AdminUsersPage
        onSearch={(q) => {
          void navigate({ search: q ? { q } : {} });
        }}
        search={search.q ?? ""}
        userId={data.user.id}
        view={search.view ?? "users"}
      />
    </PermissionBoundary>
  ) : null;
}
