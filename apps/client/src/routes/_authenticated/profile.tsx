import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/profile/profile-page";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const { data } = authClient.useSession();
  return data ? <ProfilePage key={data.user.id} user={data.user} /> : null;
}
