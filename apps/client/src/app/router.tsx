import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { RouteError, RouteNotFound } from "@/components/route-feedback";

export const router = createRouter({ routeTree, scrollRestoration: true, defaultErrorComponent: RouteError, defaultNotFoundComponent: RouteNotFound });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
