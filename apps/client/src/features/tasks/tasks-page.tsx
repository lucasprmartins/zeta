import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import {
  Can,
  usePermissions,
  useRefreshSessionOnAuthError,
  useUserId,
} from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { permissions } from "@/lib/access";
import { actionErrorMessage, byId, useInfiniteList } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { DeleteTaskModal } from "./delete-task-modal";
import {
  infiniteTasksQuery,
  type Task,
  type TaskFilter,
  useTasksRefresh,
} from "./queries";
import { TaskEditorModal } from "./task-editor-modal";
import { TaskItem } from "./task-item";
import { TaskPanel } from "./task-panel";
import { statusLabels } from "./task-status";
import { TasksEmpty } from "./tasks-empty";
import { TasksSkeleton } from "./tasks-skeleton";

const filters = [
  ["all", "Todas"],
  ["pending", `${statusLabels.pending}s`],
  ["completed", `${statusLabels.completed}s`],
] as const;

export function TasksPage({
  filter,
  onFilter,
  taskId,
  onOpenTask,
  onCloseTask,
}: {
  taskId: string | undefined;
  onOpenTask: (id: string) => void;
  onCloseTask: () => void;
  filter: TaskFilter;
  onFilter: (filter: TaskFilter) => void;
}) {
  const { can } = usePermissions();
  const refresh = useTasksRefresh();
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = useInfiniteQuery(infiniteTasksQuery(useUserId(), filter));
  const status = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.setStatus>[0]) =>
      rpc.tasks.setStatus(input),
    onSuccess: refresh,
  });
  useRefreshSessionOnAuthError([tasks.error, status.error]);

  const openEditor = useCallback(
    (task: Task | "new") => {
      if (
        can(
          task === "new" ? permissions.tasks.create : permissions.tasks.update
        )
      ) {
        setEditor(task);
      }
    },
    [can]
  );
  const openTask = useCallback(
    (task: Task) => onOpenTask(task.id),
    [onOpenTask]
  );
  const { mutate: setStatus } = status;
  const toggleStatus = useCallback(
    (task: Task) =>
      setStatus({
        id: task.id,
        status: task.status === "pending" ? "completed" : "pending",
      }),
    [setStatus]
  );
  const { items, loadMore } = useInfiniteList(tasks, byId);
  const total = tasks.data?.pages.at(-1)?.total ?? 0;

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
        description="O que a equipe precisa fazer, à vista de todos."
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
              if (filters.some(([option]) => option === value)) {
                onFilter(value as TaskFilter);
              }
            }}
            type="single"
            value={filter}
          >
            {filters.map(([value, label]) => (
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
            <ErrorNotice message={actionErrorMessage(status.error)} />
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
              message="Não foi possível carregar as tarefas."
              retry={() => void tasks.refetch()}
            />
          </div>
        ) : items.length === 0 ? (
          <TasksEmpty
            canCreate={can(permissions.tasks.create)}
            filter={filter}
            onClearFilter={() => onFilter("all")}
            onCreate={() => openEditor("new")}
          />
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden items-center gap-3 border-b bg-sidebar px-4 py-2.5 font-medium text-[11px] text-muted-foreground sm:flex"
            >
              <span className="w-10 shrink-0" />
              <span className="flex-1">Tarefa</span>
              <span className="w-32 shrink-0 lg:w-40">Responsável</span>
              <span className="w-24 shrink-0">Status</span>
              <span className="hidden w-28 shrink-0 xl:block">Criada em</span>
              <span className="w-[72px] shrink-0 text-right">Ações</span>
            </div>
            <ul>
              {items.map((task) => (
                <TaskItem
                  key={task.id}
                  onDelete={setDeleting}
                  onEdit={openEditor}
                  onOpen={openTask}
                  onStatus={toggleStatus}
                  pending={status.isPending && status.variables?.id === task.id}
                  task={task}
                />
              ))}
            </ul>
            {(tasks.hasNextPage ||
              tasks.isFetchingNextPage ||
              tasks.isFetchNextPageError) && (
              <footer className="border-t px-4 py-4">
                <InfiniteScroll onLoadMore={loadMore} query={tasks} />
              </footer>
            )}
          </>
        )}
      </section>

      {taskId && (
        <TaskPanel key={taskId} onClose={onCloseTask} taskId={taskId} />
      )}
      {editor !== null && (
        <TaskEditorModal
          key={editor === "new" ? "new" : editor.id}
          onClose={() => setEditor(null)}
          onCreated={() => onFilter("all")}
          task={editor}
        />
      )}
      {deleting && can(permissions.tasks.delete) && (
        <DeleteTaskModal onClose={() => setDeleting(null)} task={deleting} />
      )}
    </PageContent>
  );
}
