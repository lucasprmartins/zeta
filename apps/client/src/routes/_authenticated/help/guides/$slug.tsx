import { createFileRoute } from "@tanstack/react-router";
import { GuideReadPage } from "@/features/guides/pages";

export const Route = createFileRoute("/_authenticated/help/guides/$slug")({
  component: GuideReadRoute,
  staticData: {
    crumbs: [
      { label: "Ajuda", to: "/help" },
      { label: "Guia de uso", to: "/help/guides" },
      { label: "Guia" },
    ],
  },
});

function GuideReadRoute() {
  return <GuideReadPage slug={Route.useParams().slug} />;
}
