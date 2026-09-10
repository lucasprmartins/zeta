import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/features/guides/pages";
import { authClient } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/help/guides/")({
  component: Page,
});
function Page() {
  const { data } = authClient.useSession();
  return data ? <GuidesPage {...{ userId: data.user.id }} /> : null;
}
