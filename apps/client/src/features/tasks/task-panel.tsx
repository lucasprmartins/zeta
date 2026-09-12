import { LinkIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorNotice } from "@/components/feedback";
import { Can, useUserId } from "@/components/permission-boundary";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidePanel, SidePanelActions } from "@/components/ui/side-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { permissions } from "@/lib/access";
import { hasStatus } from "@/lib/query";
import { type Task, type TaskUser, taskQuery } from "./queries";
import { TaskStatusBadge } from "./task-status";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

function Person({ person }: { person: TaskUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar image={person.image} name={person.name} size="sm" />
      <div className="min-w-0">
        <p className="font-medium">{person.name}</p>
        {person.username && (
          <p className="text-muted-foreground text-xs">@{person.username}</p>
        )}
      </div>
    </div>
  );
}

function TaskDetails({ task }: { task: Task }) {
  return (
    <div className="space-y-7 text-sm">
      <section aria-label="Status">
        <TaskStatusBadge status={task.status} />
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">Descrição</h3>
        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {task.description || "Nenhuma descrição informada."}
        </p>
      </section>
      <section className="space-y-3">
        <h3 className="font-medium">Responsáveis</h3>
        {task.mentions.length ? (
          <ul className="space-y-3">
            {task.mentions.map((person) => (
              <li key={person.id}>
                <Person person={person} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Sem responsável.</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="font-medium">Autor</h3>
        {task.author ? (
          <Person person={task.author} />
        ) : (
          <p className="text-muted-foreground">Sem autor.</p>
        )}
      </section>
      <dl className="space-y-4 border-t pt-5">
        {(
          [
            ["Criada em", task.createdAt],
            ["Atualizada em", task.updatedAt],
            ["Concluída em", task.completedAt],
          ] as const
        ).map(([label, date]) => (
          <div className="space-y-1" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd>
              {date ? (
                <time dateTime={date}>{dateFormat.format(new Date(date))}</time>
              ) : (
                "Ainda não concluída"
              )}
            </dd>
          </div>
        ))}
        <div className="space-y-1">
          <dt className="text-muted-foreground">Identificador</dt>
          <dd className="font-mono text-xs">{task.id}</dd>
        </div>
      </dl>
    </div>
  );
}

export function TaskPanel({
  taskId,
  onClose,
  onEdit,
  onDelete,
}: {
  taskId: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const query = useQuery(taskQuery(useUserId(), taskId));
  const unavailable = hasStatus(query.error, 400, 404);
  const denied = hasStatus(query.error, 401, 403);
  // Não mantém detalhes em tela após uma resposta de revogação ou exclusão.
  const task = unavailable || denied ? undefined : query.data;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link da tarefa copiado.");
    } catch {
      toast.error(
        "Não foi possível copiar. Copie o endereço na barra do navegador."
      );
    }
  }
  return (
    <SidePanel
      footer={
        <SidePanelActions>
          {task && (
            <Can permission={permissions.tasks.update}>
              <Button onClick={() => onEdit(task)}>
                <PencilSimpleIcon aria-hidden="true" />
                Editar tarefa
              </Button>
            </Can>
          )}
          <Button onClick={() => void copyLink()} variant="outline">
            <LinkIcon />
            Copiar link
          </Button>
          {task && (
            <Can permission={permissions.tasks.delete}>
              <Button
                className="@min-[480px]/panel:ml-auto"
                onClick={() => onDelete(task)}
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" />
                Excluir tarefa
              </Button>
            </Can>
          )}
        </SidePanelActions>
      }
      label="Detalhes da tarefa"
      onClose={onClose}
    >
      <header className="mb-6 space-y-2">
        <h2
          className="break-words font-semibold text-xl outline-none"
          tabIndex={-1}
        >
          {task?.title ?? "Detalhes da tarefa"}
        </h2>
        <p className="text-muted-foreground text-sm">
          Informações da tarefa compartilhada com a equipe.
        </p>
      </header>
      {query.isPending ? (
        <div
          aria-busy="true"
          aria-label="Carregando tarefa"
          className="space-y-6"
          role="status"
        >
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {query.error && (
            <div className="mb-5">
              <ErrorNotice
                message={
                  unavailable
                    ? "Tarefa não encontrada. O link pode ser inválido ou a tarefa foi excluída."
                    : denied
                      ? "Você não tem acesso a esta tarefa ou sua sessão expirou."
                      : "Não foi possível carregar os detalhes da tarefa."
                }
                {...(unavailable || denied
                  ? {}
                  : { retry: () => void query.refetch() })}
              />
            </div>
          )}
          {task && <TaskDetails task={task} />}
        </>
      )}
    </SidePanel>
  );
}
