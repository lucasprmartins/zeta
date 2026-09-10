import {
  ArrowClockwiseIcon,
  CheckSquareIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Can, usePermissions } from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Modal } from "@/components/ui/modal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";
import { isForbidden, isUnauthorized } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import {
  infiniteTasksQuery,
  type Task,
  type TaskFilter,
  taskKeys,
} from "./queries";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";
import { TasksSkeleton } from "./tasks-skeleton";

export function TasksPage({
  userId,
  filter,
  onFilter,
}: {
  userId: string;
  filter: TaskFilter;
  onFilter: (filter: TaskFilter) => void;
}) {
  const { can } = usePermissions();
  const client = useQueryClient();
  const session = authClient.useSession();
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = useInfiniteQuery(infiniteTasksQuery(userId, filter));
  const refresh = () =>
    client.invalidateQueries({ queryKey: taskKeys.all(userId) });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.create>[0]) =>
      rpc.tasks.create(input),
    onSuccess: async () => {
      setEditor(null);
      onFilter("all");
      await refresh();
    },
  });
  const edit = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.update>[0]) =>
      rpc.tasks.update(input),
    onSuccess: async () => {
      setEditor(null);
      await refresh();
    },
  });
  const status = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.setStatus>[0]) =>
      rpc.tasks.setStatus(input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (input: { id: string }) => rpc.tasks.delete(input),
    onSuccess: async () => {
      setDeleting(null);
      await refresh();
    },
  });
  const errorMessage = (error: unknown) =>
    isUnauthorized(error)
      ? "Sua sessão expirou. Entre novamente."
      : isForbidden(error)
        ? "Sua conta não tem permissão para esta ação."
        : "Não foi possível salvar. Tente novamente.";
  useEffect(() => {
    if (
      [tasks.error, create.error, edit.error, status.error, remove.error].some(
        (error) => isUnauthorized(error) || isForbidden(error)
      )
    ) {
      void session.refetch();
    }
  }, [
    tasks.error,
    create.error,
    edit.error,
    status.error,
    remove.error,
    session.refetch,
  ]);

  function openEditor(task: Task | "new") {
    if (
      !can(task === "new" ? permissions.tasks.create : permissions.tasks.update)
    ) {
      return;
    }
    create.reset();
    edit.reset();
    setEditor(task);
  }
  const saving = create.isPending || edit.isPending;
  const editorError = editor === "new" ? create.error : edit.error;
  // Mudanças concorrentes na paginação por offset podem repetir IDs entre páginas.
  const items = [
    ...new Map(
      tasks.data?.pages
        .flatMap((page) => page.items)
        .map((task) => [task.id, task]) ?? []
    ).values(),
  ];
  const total = tasks.data?.pages.at(-1)?.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetching } = tasks;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [fetchNextPage, hasNextPage, isFetching]);

  return (
    <PageContent>
      <PageHeader
        actions={
          <Can permission={permissions.tasks.create}>
            <Button onClick={() => openEditor("new")} size="sm">
              <PlusIcon />
              Nova tarefa
            </Button>
          </Can>
        }
        description="Tudo o que você precisa fazer, em um só lugar."
        title="Tarefas"
      />

      <section
        aria-label="Lista de tarefas"
        className="overflow-hidden rounded-xl border"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <ToggleGroup
            aria-label="Filtrar tarefas"
            className="grid w-full grid-cols-3 sm:flex sm:w-auto"
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "pending" ||
                value === "completed"
              ) {
                onFilter(value);
              }
            }}
            type="single"
            value={filter}
          >
            {(
              [
                ["all", "Todas"],
                ["pending", "Pendentes"],
                ["completed", "Concluídas"],
              ] as const
            ).map(([value, label]) => (
              <ToggleGroupItem
                className="px-2 text-xs sm:px-3 sm:text-sm"
                key={value}
                value={value}
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <span className="text-muted-foreground text-xs">
              {tasks.data
                ? `${total} ${total === 1 ? "tarefa" : "tarefas"}`
                : ""}
            </span>
            <Button
              aria-label="Atualizar tarefas"
              className="size-8"
              disabled={tasks.isFetching}
              onClick={() => void tasks.refetch()}
              size="icon"
              title="Atualizar tarefas"
              variant="ghost"
            >
              <ArrowClockwiseIcon
                className={tasks.isFetching ? "animate-spin" : ""}
              />
            </Button>
          </div>
        </div>
        {status.error && (
          <div className="border-b p-4">
            <ErrorNotice message={errorMessage(status.error)} />
          </div>
        )}
        {tasks.isRefetchError && tasks.data && (
          <div className="border-b p-4">
            <ErrorNotice
              message="Não foi possível atualizar a lista."
              retry={() => void tasks.refetch()}
            />
          </div>
        )}
        {tasks.isPending ? (
          <TasksSkeleton />
        ) : tasks.isError && !tasks.data ? (
          <div className="p-6">
            <ErrorNotice
              message="Não foi possível carregar suas tarefas."
              retry={() => void tasks.refetch()}
            />
          </div>
        ) : items.length === 0 ? (
          <Empty className="min-h-80">
            <EmptyMedia>
              <CheckSquareIcon aria-hidden="true" weight="regular" />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "all"
                ? can(permissions.tasks.create)
                  ? "Seu próximo passo começa aqui"
                  : "Nenhuma tarefa encontrada"
                : filter === "pending"
                  ? "Nenhuma tarefa pendente"
                  : "Ainda não há tarefas concluídas"}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? can(permissions.tasks.create)
                  ? "Crie sua primeira tarefa. Você pode adicionar detalhes e marcar como concluída quando terminar."
                  : "Suas tarefas aparecerão neste espaço."
                : "Use os filtros para acompanhar suas outras tarefas."}
            </EmptyDescription>
            <EmptyContent>
              {(filter !== "all" || can(permissions.tasks.create)) && (
                <Button
                  onClick={() =>
                    filter === "all" ? openEditor("new") : onFilter("all")
                  }
                  size="sm"
                  variant="outline"
                >
                  {filter === "all"
                    ? "Criar primeira tarefa"
                    : "Ver todas as tarefas"}
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden items-center gap-3 border-b bg-sidebar px-4 py-2.5 font-medium text-[11px] text-muted-foreground sm:flex"
            >
              <span className="w-10 shrink-0" />
              <span className="flex-1">Tarefa</span>
              <span className="w-24">Estado</span>
              <span className="hidden w-28 lg:block">Criada em</span>
              <span className="w-[72px] text-right">Ações</span>
            </div>
            <ul>
              {items.map((task) => (
                <TaskItem
                  key={task.id}
                  onDelete={(item) => {
                    remove.reset();
                    setDeleting(item);
                  }}
                  onEdit={openEditor}
                  onStatus={(item) => {
                    status.mutate({
                      id: item.id,
                      status:
                        item.status === "pending" ? "completed" : "pending",
                    });
                  }}
                  pending={status.isPending && status.variables?.id === task.id}
                  task={task}
                />
              ))}
            </ul>
            {(tasks.hasNextPage ||
              tasks.isFetchingNextPage ||
              tasks.isFetchNextPageError) && (
              <footer className="border-t px-4 py-4">
                <InfiniteScroll
                  error={tasks.isFetchNextPageError}
                  hasNextPage={tasks.hasNextPage}
                  isFetching={tasks.isFetching}
                  isFetchingNextPage={tasks.isFetchingNextPage}
                  onLoadMore={loadMore}
                  paused={tasks.isRefetchError}
                />
              </footer>
            )}
          </>
        )}
      </section>

      {editor !== null &&
        can(
          editor === "new" ? permissions.tasks.create : permissions.tasks.update
        ) && (
          <Modal
            description={
              editor === "new"
                ? "O que você quer realizar?"
                : "Atualize o título e os detalhes da tarefa."
            }
            onClose={() => setEditor(null)}
            pending={saving}
            title={editor === "new" ? "Nova tarefa" : "Editar tarefa"}
          >
            <TaskForm
              key={editor === "new" ? "new" : editor.id}
              {...(editor === "new" ? {} : { initial: editor })}
              error={editorError ? errorMessage(editorError) : null}
              onCancel={() => setEditor(null)}
              onSubmit={(fields) =>
                editor === "new"
                  ? create.mutate(fields)
                  : edit.mutate({ id: editor.id, ...fields })
              }
              pending={saving}
            />
          </Modal>
        )}
      {deleting && can(permissions.tasks.delete) && (
        <Modal
          description="Esta ação é permanente e não pode ser desfeita."
          onClose={() => setDeleting(null)}
          pending={remove.isPending}
          title="Excluir tarefa?"
          variant="confirmation"
        >
          <p className="mb-6 break-words rounded-lg border bg-sidebar p-4 font-medium text-sm">
            {deleting.title}
          </p>
          {remove.error && (
            <div className="mb-4">
              <ErrorNotice message={errorMessage(remove.error)} />
            </div>
          )}
          <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
            <Button
              data-modal-autofocus
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: deleting.id })}
            >
              {remove.isPending ? "Excluindo…" : "Excluir tarefa"}
            </Button>
          </div>
        </Modal>
      )}
    </PageContent>
  );
}
