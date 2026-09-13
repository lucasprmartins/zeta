import { CheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { AvatarStack } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { Task } from "./queries";
import { TaskStatusBadge } from "./task-status";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function Assignees({ people }: { people: Task["mentions"] }) {
  return (
    <span
      className="flex min-w-0 items-center gap-2"
      title={people.map((person) => person.name).join(", ")}
    >
      <AvatarStack limit={3} people={people} />
      <span className="truncate text-muted-foreground text-xs">
        {people.length === 0
          ? "Sem responsável"
          : people.length === 1
            ? people[0]?.name
            : `${people.length} responsáveis`}
      </span>
    </span>
  );
}

function CreatedAt({ task }: { task: Task }) {
  return (
    <time className="text-muted-foreground text-xs" dateTime={task.createdAt}>
      {dateFormat.format(new Date(task.createdAt))}
    </time>
  );
}

export const taskColumnClassNames = {
  completion: "w-14 pr-0 pl-2 align-top @min-[960px]/tasks:align-middle",
  title: "px-3",
  assignees: "hidden @min-[800px]/tasks:table-cell w-44",
  status: "hidden @min-[480px]/tasks:table-cell w-32",
  createdAt: "hidden @min-[960px]/tasks:table-cell w-36",
};

export function taskColumns({
  canSetStatus,
  pendingId,
  onStatus,
  onOpen,
}: {
  canSetStatus: boolean;
  pendingId: string | undefined;
  onStatus: (task: Task) => void;
  onOpen: (task: Task) => void;
}): DataTableColumn<Task>[] {
  return [
    {
      id: "completion",
      header: () => <span className="sr-only">Conclusão</span>,
      cell: ({ row }) => {
        const task = row.original;
        const completed = task.status === "completed";
        const pending = task.id === pendingId;
        return (
          <label className="relative flex size-11 items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-ring">
            <input
              aria-label={`${completed ? "Reabrir" : "Concluir"} ${task.title}`}
              checked={completed}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              disabled={pending || !canSetStatus}
              onChange={() => onStatus(task)}
              type="checkbox"
            />
            <span
              className={`pointer-events-none flex size-4 items-center justify-center rounded border peer-disabled:opacity-50 ${completed ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
            >
              {pending ? (
                <SpinnerGapIcon aria-hidden className="size-3 animate-spin" />
              ) : (
                completed && <CheckIcon aria-hidden className="size-3" />
              )}
            </span>
          </label>
        );
      },
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Tarefa",
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            aria-label={`Abrir ${row.original.title}`}
            className="block min-h-11 w-full rounded-sm py-2 text-left font-medium leading-relaxed underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => onOpen(row.original)}
            type="button"
          >
            {row.original.title}
          </button>
          <div className="flex @min-[960px]/tasks:hidden flex-wrap items-center gap-x-3 gap-y-2 pb-1">
            <span className="@min-[480px]/tasks:hidden shrink-0">
              <TaskStatusBadge status={row.original.status} />
            </span>
            <span className="@min-[800px]/tasks:hidden min-w-0 max-w-full">
              <Assignees people={row.original.mentions} />
            </span>
            <span className="shrink-0">
              <CreatedAt task={row.original} />
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "assignees",
      header: "Responsáveis",
      cell: ({ row }) => <Assignees people={row.original.mentions} />,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Criada em",
      cell: ({ row }) => <CreatedAt task={row.original} />,
    },
  ];
}
