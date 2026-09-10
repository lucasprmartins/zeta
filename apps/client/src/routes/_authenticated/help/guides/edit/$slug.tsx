import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { GuideEditorPage } from "@/features/guides/editor-page";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/help/guides/edit/$slug")({
  component: Page,
});
function Page() {
  const { data } = authClient.useSession();
  const { slug } = Route.useParams();
  return data ? (
    <PermissionBoundary permission={permissions.access.manage}>
      <GuideEditorPage {...{ userId: data.user.id, slug }} />
    </PermissionBoundary>
  ) : null;
}
