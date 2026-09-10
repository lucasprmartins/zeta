import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "@/features/help/help-page";

export const Route = createFileRoute("/_authenticated/help/")({
  component: HelpPage,
  staticData: { crumbs: [{ label: "Ajuda" }] },
});
