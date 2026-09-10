import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { GuidesPage } from "@/features/guides/pages";
import { PermissionBoundary } from "@/components/permission-boundary";
import { permissions } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/admin/guides/")({ component: Page });
function Page() {
  const { data } = authClient.useSession();
  return data ? <PermissionBoundary permission={permissions.access.manage}><GuidesPage {...{ userId: data.user.id, admin: true }} /></PermissionBoundary> : null;
}
