import { createFileRoute } from "@tanstack/react-router";
import { PermissionBoundary } from "@/components/permission-boundary";
import { GuideEditorPage } from "@/features/guides/editor-page";
import { permissions } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/help/guides/new")({
  component: GuideCreateRoute,
  staticData: {
    crumbs: [
      { label: "Ajuda", to: "/help" },
      { label: "Guia de uso", to: "/help/guides" },
      { label: "Novo guia" },
    ],
  },
});

function GuideCreateRoute() {
  return (
    <PermissionBoundary permission={permissions.access.manage}>
      <GuideEditorPage />
    </PermissionBoundary>
  );
}
