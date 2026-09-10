import { createFileRoute } from "@tanstack/react-router";
import { GuideReadPage } from "@/features/guides/pages";
import { authClient } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/help/guides/$slug")({
  component: Page,
  staticData: {
    crumbs: [
      { label: "Ajuda", to: "/help" },
      { label: "Guia de uso", to: "/help/guides" },
      { label: "Guia" },
    ],
  },
});
function Page() {
  const { data } = authClient.useSession();
  const { slug } = Route.useParams();
  return data ? <GuideReadPage {...{ userId: data.user.id, slug }} /> : null;
}
