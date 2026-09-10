import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { GuideEditorPage } from "@/features/guides/editor-page";
import { PermissionBoundary } from "@/components/permission-boundary";
import { permissions } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/admin/guides/edit/$slug")({ component: Page });
function Page() {
  const { data } = authClient.useSession();
  const { slug } = Route.useParams();
  return data ? <PermissionBoundary permission={permissions.access.manage}><GuideEditorPage {...{ userId: data.user.id, slug: slug }} /></PermissionBoundary> : null;
}
