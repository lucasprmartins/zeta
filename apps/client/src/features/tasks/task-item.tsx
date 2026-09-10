import {
  CheckIcon,
  PencilSimpleIcon,
  SpinnerGapIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { memo } from "react";
import { Can, usePermissions } from "@/components/permission-boundary";
import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { permissions } from "@/lib/access";
import type { Task } from "./queries";
import { TaskStatusBadge } from "./task-status";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const STACKED_AVATARS = 3;

const allNames = (people: Task["mentions"]) =>
  people.map((person) => person.name).join(", ");

function Assignees({ people }: { people: Task["mentions"] }) {
  const [first] = people;
  if (!first) {
    return (
      <span className="text-muted-foreground text-xs">Sem responsável</span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2" title={allNames(people)}>
      <AvatarStack limit={STACKED_AVATARS} people={people} />
      <span className="truncate text-xs">
        {people.length === 1 ? first.name : `${people.length} responsáveis`}
      </span>
    </span>
  );
}

function TaskRow({
  task,
  pending,
  onStatus,
  onDelete,
  onEdit,
  onOpen,
}: {
  task: Task;
  pending: boolean;
  onStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
}) {
  const { can } = usePermissions();
  const completed = task.status === "completed";
  return (
    <li className="group grid grid-cols-[44px_minmax(0,1fr)] items-start gap-2 border-b px-3 py-3 last:border-b-0 hover:bg-sidebar/70 sm:flex sm:items-center sm:gap-3 sm:px-4">
      {/* biome-ignore lint/a11y/useSemanticElements: alternar status é uma ação, não um campo de formulário. */}
      <button
        aria-checked={completed}
        aria-label={`${completed ? "Reabrir" : "Concluir"} ${task.title}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:size-10"
        disabled={pending || !can(permissions.tasks.setStatus)}
        onClick={() => onStatus(task)}
        role="checkbox"
        type="button"
      >
        <span
          className={`flex size-5 items-center justify-center rounded border ${completed ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background group-hover:border-foreground"}`}
        >
          {pending ? (
            <SpinnerGapIcon className="size-3 animate-spin" />
          ) : (
            completed && <CheckIcon className="size-3.5" />
          )}
        </span>
      </button>
      <button
        aria-label={`Abrir ${task.title}`}
        className="min-h-11 min-w-0 flex-1 rounded-sm py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4 sm:min-h-0"
        onClick={() => onOpen(task)}
        type="button"
      >
        <span
          className={`block break-words font-medium text-sm ${completed ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </span>
        {/* No celular não há colunas: status, data e responsáveis vêm aqui. */}
        <span className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
          <TaskStatusBadge status={task.status} />
          <span className="text-[11px] text-muted-foreground">
            {dateFormat.format(new Date(task.createdAt))}
          </span>
          {task.mentions.length > 0 && (
            <AvatarStack limit={STACKED_AVATARS} people={task.mentions} />
          )}
        </span>
      </button>
      <span className="hidden w-32 shrink-0 sm:block lg:w-40">
        <Assignees people={task.mentions} />
      </span>
      <span className="hidden w-24 shrink-0 sm:block">
        <TaskStatusBadge status={task.status} />
      </span>
      <time
        className="hidden w-28 shrink-0 text-muted-foreground text-xs xl:block"
        dateTime={task.createdAt}
      >
        {dateFormat.format(new Date(task.createdAt))}
      </time>
      <div className="col-start-2 flex shrink-0 justify-end gap-1 sm:gap-0">
        <Can permission={permissions.tasks.update}>
          <Button
            aria-label={`Editar ${task.title}`}
            className="w-auto gap-2 px-3 text-muted-foreground sm:size-9 sm:px-0"
            disabled={pending}
            onClick={() => onEdit(task)}
            size="icon"
            title="Editar tarefa"
            variant="ghost"
          >
            <PencilSimpleIcon />
            <span className="sm:hidden">Editar</span>
          </Button>
        </Can>
        <Can permission={permissions.tasks.delete}>
          <Button
            aria-label={`Excluir ${task.title}`}
            className="w-auto gap-2 px-3 text-muted-foreground sm:size-9 sm:px-0"
            disabled={pending}
            onClick={() => onDelete(task)}
            size="icon"
            title="Excluir tarefa"
            variant="ghost"
          >
            <TrashIcon />
            <span className="sm:hidden">Excluir</span>
          </Button>
        </Can>
      </div>
    </li>
  );
}

// A lista carrega várias páginas: só a linha alterada precisa redesenhar.
export const TaskItem = memo(TaskRow);
