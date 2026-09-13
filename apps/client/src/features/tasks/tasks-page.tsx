import { PlusIcon } from "@phosphor-icons/react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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
import { DataTable } from "@/components/ui/data-table";
import { permissions } from "@/lib/access";
import { actionErrorMessage, byId, useInfiniteList } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { DeleteTaskModal } from "./delete-task-modal";
import { infiniteTasksQuery, type Task, useTasksRefresh } from "./queries";
import { taskColumnClassNames, taskColumns } from "./task-columns";
import { TaskEditorModal } from "./task-editor-modal";
import {
  emptyTaskCriteria,
  hasTaskCriteria,
  type TaskCriteria,
} from "./task-filters";
import { TaskPanel } from "./task-panel";
import { TasksEmpty } from "./tasks-empty";
import { TasksSkeleton } from "./tasks-skeleton";
import { TasksToolbar } from "./tasks-toolbar";

export function TasksPage({
  criteria,
  onCriteria,
  taskId,
  onOpenTask,
  onCloseTask,
}: {
  taskId: string | undefined;
  onOpenTask: (id: string) => void;
  onCloseTask: () => void;
  criteria: TaskCriteria;
  onCriteria: (criteria: TaskCriteria) => void;
}) {
  const { can } = usePermissions();
  const refresh = useTasksRefresh();
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = useInfiniteQuery(infiniteTasksQuery(useUserId(), criteria));
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
  const canSetStatus = can(permissions.tasks.setStatus);
  const pendingId = pendingTaskId(status);
  const columns = useMemo(
    () =>
      taskColumns({
        canSetStatus,
        pendingId,
        onStatus: toggleStatus,
        onOpen: openTask,
      }),
    [canSetStatus, pendingId, toggleStatus, openTask]
  );

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
        className="@container/tasks min-w-0 space-y-4"
      >
        <TasksToolbar
          criteria={criteria}
          onChange={onCriteria}
          onRefresh={() => void tasks.refetch()}
          refreshing={tasks.isFetching}
          total={tasks.data ? total : undefined}
        />
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
            filter={criteria.status}
            onClearFilter={() => onCriteria(emptyTaskCriteria)}
            onCreate={() => openEditor("new")}
            searched={hasTaskCriteria(criteria)}
          />
        ) : (
          <>
            <DataTable
              activeRowId={taskId}
              columnClassNames={taskColumnClassNames}
              columns={columns}
              data={items}
              getRowId={taskRowId}
              label="Tarefas da equipe"
            />
            {(tasks.hasNextPage ||
              tasks.isFetchingNextPage ||
              tasks.isFetchNextPageError) && (
              <footer className="py-2">
                <InfiniteScroll onLoadMore={loadMore} query={tasks} />
              </footer>
            )}
          </>
        )}
      </section>

      {taskId && (
        <TaskPanel
          key={taskId}
          onClose={onCloseTask}
          onDelete={setDeleting}
          onEdit={openEditor}
          taskId={taskId}
        />
      )}
      {editor !== null && (
        <TaskEditorModal
          key={editor === "new" ? "new" : editor.id}
          onClose={() => setEditor(null)}
          onCreated={() => onCriteria(emptyTaskCriteria)}
          task={editor}
        />
      )}
      {deleting && can(permissions.tasks.delete) && (
        <DeleteTaskModal
          onClose={() => setDeleting(null)}
          onDeleted={onCloseTask}
          task={deleting}
        />
      )}
    </PageContent>
  );
}

const taskRowId = (task: Task) => task.id;

function pendingTaskId(status: {
  isPending: boolean;
  variables: { id: string } | undefined;
}) {
  return status.isPending ? status.variables?.id : undefined;
}
