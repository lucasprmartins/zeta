import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRoute,
  staticData: { crumbs: [{ label: "Workspace" }, { label: "Dashboard" }] },
});

function DashboardRoute() {
  const { data } = authClient.useSession();
  return data ? (
    <PermissionBoundary permission={permissions.tasks.read}>
      <DashboardPage key={data.user.id} userId={data.user.id} />
    </PermissionBoundary>
  ) : null;
}
