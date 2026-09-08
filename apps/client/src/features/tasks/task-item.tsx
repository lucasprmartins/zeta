import { CheckIcon, PencilSimpleIcon, TrashIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Task } from "./queries";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function TaskItem({ task, pending, onStatus, onDelete, onEdit }: {
  task: Task; pending: boolean;
  onStatus: (task: Task) => void; onDelete: (task: Task) => void; onEdit: (task: Task) => void;
}) {
  const completed = task.status === "completed";
  return <li className="group grid grid-cols-[44px_minmax(0,1fr)] items-start gap-2 border-b px-3 py-3 last:border-b-0 hover:bg-sidebar/70 sm:flex sm:items-center sm:gap-3 sm:px-4">
    <button type="button" role="checkbox" aria-checked={completed} aria-label={`${completed ? "Reabrir" : "Concluir"} ${task.title}`} disabled={pending} onClick={() => onStatus(task)}
      className="flex size-11 shrink-0 sm:size-10 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
      <span className={`flex size-5 items-center justify-center rounded border ${completed ? "border-primary bg-primary text-white" : "border-neutral-400 bg-white group-hover:border-neutral-700"}`}>
        {pending ? <SpinnerGapIcon className="size-3 animate-spin" /> : completed && <CheckIcon className="size-3.5" />}
      </span>
    </button>
    <button type="button" onClick={() => onEdit(task)} disabled={pending} className="min-h-11 min-w-0 flex-1 rounded-sm py-1 sm:min-h-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`Abrir ${task.title}`}>
      <span className={`block break-words text-sm font-medium ${completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
      {task.description && <span className="mt-1 block truncate text-xs text-muted-foreground">{task.description}</span>}
      <span className="mt-2 block text-[11px] text-muted-foreground sm:hidden">{completed ? "Concluída" : "Pendente"} · {dateFormat.format(new Date(task.createdAt))}</span>
    </button>
    <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block"><span className={`mr-2 inline-block size-1.5 rounded-full ${completed ? "bg-neutral-800" : "border border-neutral-500"}`} />{completed ? "Concluída" : "Pendente"}</span>
    <time dateTime={task.createdAt} className="hidden w-28 shrink-0 text-xs text-muted-foreground lg:block">{dateFormat.format(new Date(task.createdAt))}</time>
    <div className="col-start-2 flex shrink-0 justify-end gap-1 sm:gap-0">
      <Button variant="ghost" size="icon" className="w-auto gap-2 px-3 text-muted-foreground sm:size-9 sm:px-0" aria-label={`Editar ${task.title}`} title="Editar tarefa" disabled={pending} onClick={() => onEdit(task)}><PencilSimpleIcon /><span className="sm:hidden">Editar</span></Button>
      <Button variant="ghost" size="icon" className="w-auto gap-2 px-3 text-muted-foreground sm:size-9 sm:px-0" aria-label={`Excluir ${task.title}`} title="Excluir tarefa" disabled={pending} onClick={() => onDelete(task)}><TrashIcon /><span className="sm:hidden">Excluir</span></Button>
    </div>
  </li>;
}
