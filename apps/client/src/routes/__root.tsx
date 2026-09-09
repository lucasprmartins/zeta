import { createRootRoute } from "@tanstack/react-router";
import { RootLayout } from "@/app/root-layout";
import { RouteError, RouteNotFound } from "@/components/route-feedback";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: RouteNotFound,
  errorComponent: RouteError,
});
