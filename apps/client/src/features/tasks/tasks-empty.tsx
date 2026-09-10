import { CheckSquareIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TaskFilter } from "./queries";

// Cada recorte da lista tem um vazio próprio; sem tarefa alguma, o texto ainda
// depende de a conta poder criar.
const messages = {
  pending: {
    title: "Nenhuma tarefa pendente",
    description: "Use os filtros para acompanhar as demais tarefas.",
  },
  completed: {
    title: "Ainda não há tarefas concluídas",
    description: "Use os filtros para acompanhar as demais tarefas.",
  },
} as const;

export function TasksEmpty({
  filter,
  canCreate,
  onCreate,
  onClearFilter,
}: {
  filter: TaskFilter;
  canCreate: boolean;
  onCreate: () => void;
  onClearFilter: () => void;
}) {
  const filtered = filter !== "all";
  const { title, description } = filtered
    ? messages[filter]
    : canCreate
      ? {
          title: "O primeiro passo começa aqui",
          description:
            "Crie a primeira tarefa. Todas as contas veem o que está aqui, e você pode indicar o responsável por cada uma.",
        }
      : {
          title: "Nenhuma tarefa encontrada",
          description: "As tarefas da equipe aparecerão neste espaço.",
        };
  return (
    <Empty className="min-h-80">
      <EmptyMedia>
        <CheckSquareIcon aria-hidden="true" weight="regular" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
      <EmptyContent>
        {(filtered || canCreate) && (
          <Button
            onClick={filtered ? onClearFilter : onCreate}
            size="sm"
            variant="outline"
          >
            {filtered ? "Ver todas as tarefas" : "Criar primeira tarefa"}
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
}
