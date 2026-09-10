import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/features/guides/pages";

export const Route = createFileRoute("/_authenticated/help/guides/")({
  component: GuidesPage,
  staticData: {
    crumbs: [{ label: "Ajuda", to: "/help" }, { label: "Guia de uso" }],
  },
});
