import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth/auth-page";
import { safeReturnTo } from "@/lib/return-to";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string"
      ? { redirect: safeReturnTo(search.redirect) }
      : {},
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return (
    <AuthPage key="login" mode="login" returnTo={redirect ?? "/dashboard"} />
  );
}
