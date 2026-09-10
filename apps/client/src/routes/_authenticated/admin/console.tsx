import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { AdminConsolePage } from "@/features/access/admin-console-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/admin/console")({
  component: AdminConsoleRoute,
  staticData: { crumbs: [{ label: "Administração" }, { label: "Console" }] },
});

function AdminConsoleRoute() {
  return (
    <PermissionBoundary permission={permissions.access.manage}>
      <AdminConsolePage />
    </PermissionBoundary>
  );
}
