import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";
import { AdminConsolePage } from "@/features/access/admin-console-page";

export const Route = createFileRoute("/_authenticated/admin/console")({ component: Page });
function Page() {
  const { data } = authClient.useSession();
  return data ? <PermissionBoundary permission={permissions.access.manage}><AdminConsolePage userId={data.user.id} /></PermissionBoundary> : null;
}
