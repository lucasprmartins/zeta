import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { AdminConsolePage } from "@/features/access/admin-console-page";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/console")({
  component: Page,
  staticData: { crumbs: [{ label: "Administração" }, { label: "Console" }] },
});
function Page() {
  const { data } = authClient.useSession();
  return data ? (
    <PermissionBoundary permission={permissions.access.manage}>
      <AdminConsolePage userId={data.user.id} />
    </PermissionBoundary>
  ) : null;
}
