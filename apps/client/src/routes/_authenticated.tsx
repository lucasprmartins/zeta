import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/app/workspace";

// O prefixo _ cria um layout compartilhado sem acrescentar um segmento à URL.
export const Route = createFileRoute("/_authenticated")({ component: Workspace });
