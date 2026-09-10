import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { GuideReadPage } from "@/features/guides/pages";
export const Route = createFileRoute("/_authenticated/help/guides/$slug")({ component: Page });
function Page() {
  const { data } = authClient.useSession();
  const { slug } = Route.useParams();
  return data ? <GuideReadPage {...{ userId: data.user.id, slug: slug }} /> : null;
}
