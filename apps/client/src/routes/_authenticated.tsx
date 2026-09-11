import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/app/workspace";

// O prefixo _ cria um layout compartilhado sem acrescentar um segmento à URL.
export const Route = createFileRoute("/_authenticated")({
  component: Workspace,
  validateSearch: (
    search: Record<string, unknown>
  ): { inbox?: "all" | "unread" | undefined } => ({
    inbox:
      search.inbox === "all" || search.inbox === "unread"
        ? search.inbox
        : undefined,
  }),
});
