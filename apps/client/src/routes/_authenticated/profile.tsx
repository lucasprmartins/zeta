import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/profile/profile-page";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  staticData: { crumbs: [{ label: "Perfil" }] },
});
