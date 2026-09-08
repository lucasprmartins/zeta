import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardRoute });

function DashboardRoute() {
  const { data } = authClient.useSession();
  return data ? <DashboardPage key={data.user.id} userId={data.user.id} /> : null;
}
