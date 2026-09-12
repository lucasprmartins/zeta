import { CheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { memo } from "react";
import { usePermissions } from "@/components/permission-boundary";
import { AvatarStack } from "@/components/ui/avatar";
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
  onOpen,
}: {
  task: Task;
  pending: boolean;
  onStatus: (task: Task) => void;
  onOpen: (task: Task) => void;
}) {
  const { can } = usePermissions();
  const completed = task.status === "completed";
  return (
    <li className="group @min-[640px]/tasks:flex grid grid-cols-[44px_minmax(0,1fr)] items-start @min-[640px]/tasks:items-center @min-[640px]/tasks:gap-3 gap-2 border-b @min-[640px]/tasks:px-4 px-3 py-3 last:border-b-0 hover:bg-sidebar/70">
      {/* biome-ignore lint/a11y/useSemanticElements: alternar status é uma ação, não um campo de formulário. */}
      <button
        aria-checked={completed}
        aria-label={`${completed ? "Reabrir" : "Concluir"} ${task.title}`}
        className="flex @min-[640px]/tasks:size-10 size-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
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
        className="@min-[640px]/tasks:min-h-0 min-h-11 min-w-0 flex-1 rounded-sm py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4"
        onClick={() => onOpen(task)}
        type="button"
      >
        <span
          className={`block break-words font-medium text-sm ${completed ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </span>
        {/* Em espaços estreitos, status, data e responsáveis acompanham o título. */}
        <span className="mt-2 flex @min-[640px]/tasks:hidden flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <span className="text-[11px] text-muted-foreground">
            {dateFormat.format(new Date(task.createdAt))}
          </span>
          {task.mentions.length > 0 && (
            <AvatarStack limit={STACKED_AVATARS} people={task.mentions} />
          )}
        </span>
      </button>
      <span className="@min-[640px]/tasks:block hidden @min-[800px]/tasks:w-40 w-32 shrink-0">
        <Assignees people={task.mentions} />
      </span>
      <span className="@min-[640px]/tasks:block hidden w-24 shrink-0">
        <TaskStatusBadge status={task.status} />
      </span>
      <time
        className="@min-[960px]/tasks:block hidden w-28 shrink-0 text-muted-foreground text-xs"
        dateTime={task.createdAt}
      >
        {dateFormat.format(new Date(task.createdAt))}
      </time>
    </li>
  );
}

// A lista carrega várias páginas: só a linha alterada precisa redesenhar.
export const TaskItem = memo(TaskRow);
