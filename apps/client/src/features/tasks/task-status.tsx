import { Badge } from "@/components/ui/badge";
import type { Task } from "./queries";

// Um único rótulo por estado, usado na lista, no painel e nos filtros.
export const statusLabels = {
  pending: "Pendente",
  completed: "Concluída",
} as const;

export function TaskStatusBadge({ status }: { status: Task["status"] }) {
  return (
    <Badge variant={status === "completed" ? "default" : "outline"}>
      {statusLabels[status]}
    </Badge>
  );
}
