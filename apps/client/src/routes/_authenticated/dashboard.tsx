import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRoute,
  staticData: { crumbs: [{ label: "Workspace" }, { label: "Dashboard" }] },
});

function DashboardRoute() {
  return (
    <PermissionBoundary permission={permissions.tasks.read}>
      <DashboardPage />
    </PermissionBoundary>
  );
}
