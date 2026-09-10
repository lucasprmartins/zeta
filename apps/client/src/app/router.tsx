import { createRouter } from "@tanstack/react-router";
import { RouteError, RouteNotFound } from "@/components/route-feedback";
import { routeTree } from "@/routeTree.gen";

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
