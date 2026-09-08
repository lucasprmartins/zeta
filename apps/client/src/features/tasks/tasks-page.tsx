import { useCallback, useEffect, useState } from "react";
import { useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquareIcon, PlusIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { authClient } from "@/lib/auth";
import { isUnauthorized } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { taskKeys, infiniteTasksQuery, type Task, type TaskFilter } from "./queries";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";

export function TasksPage({ userId, filter, onFilter }: {
  userId: string; filter: TaskFilter;
  onFilter: (filter: TaskFilter) => void;
}) {
  const client = useQueryClient();
  const session = authClient.useSession();
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = useInfiniteQuery(infiniteTasksQuery(userId, filter));
  const refresh = () => client.invalidateQueries({ queryKey: taskKeys.all(userId) });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.create>[0]) => rpc.tasks.create(input),
    onSuccess: async () => { setEditor(null); onFilter("all"); await refresh(); },
  });
  const edit = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.update>[0]) => rpc.tasks.update(input),
    onSuccess: async () => { setEditor(null); await refresh(); },
  });
  const status = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.setStatus>[0]) => rpc.tasks.setStatus(input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (input: { id: string }) => rpc.tasks.delete(input),
    onSuccess: async () => { setDeleting(null); await refresh(); },
  });
  const errorMessage = (error: unknown) => isUnauthorized(error) ? "Sua sessão expirou. Entre novamente." : "Não foi possível salvar. Tente novamente.";
  useEffect(() => {
    if ([tasks.error, create.error, edit.error, status.error, remove.error].some(isUnauthorized)) void session.refetch();
  }, [tasks.error, create.error, edit.error, status.error, remove.error, session.refetch]);

  function openEditor(task: Task | "new") {
    create.reset(); edit.reset(); setEditor(task);
  }
  const saving = create.isPending || edit.isPending;
  const editorError = editor === "new" ? create.error : edit.error;
  // Mudanças concorrentes na paginação por offset podem repetir IDs entre páginas.
  const items = [...new Map(tasks.data?.pages.flatMap((page) => page.items).map((task) => [task.id, task]) ?? []).values()];
  const total = tasks.data?.pages.at(-1)?.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetching } = tasks;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage, hasNextPage, isFetching]);

  return <div className="mx-auto w-full max-w-7xl space-y-7 px-5 py-7 sm:px-8 sm:py-9">
    <PageHeader title="Tarefas" description="Tudo o que você precisa fazer, em um só lugar."
      actions={<Button size="sm" onClick={() => openEditor("new")}><PlusIcon />Nova tarefa</Button>} />

    <section aria-label="Lista de tarefas" className="overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto" aria-label="Filtrar tarefas">
          {([["all", "Todas"], ["pending", "Pendentes"], ["completed", "Concluídas"]] as const).map(([value, label]) =>
            <Button key={value} variant="ghost" size="sm" className={`px-2 text-xs sm:px-3 sm:text-sm ${filter === value ? "bg-muted" : "text-muted-foreground"}`} aria-pressed={filter === value} onClick={() => onFilter(value)}>{label}</Button>)}
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <span className="text-xs text-muted-foreground">{tasks.data ? `${total} ${total === 1 ? "tarefa" : "tarefas"}` : ""}</span>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Atualizar tarefas" title="Atualizar tarefas" disabled={tasks.isFetching} onClick={() => void tasks.refetch()}><ArrowClockwiseIcon className={tasks.isFetching ? "animate-spin" : ""} /></Button>
        </div>
      </div>
      {status.error && <div className="border-b p-4"><ErrorNotice message={errorMessage(status.error)} /></div>}
      {tasks.isRefetchError && tasks.data && <div className="border-b p-4"><ErrorNotice message="Não foi possível atualizar a lista." retry={() => void tasks.refetch()} /></div>}
      {tasks.isPending ? <Loading label="Buscando tarefas…" /> : tasks.isError && !tasks.data ?
        <div className="p-6"><ErrorNotice message="Não foi possível carregar suas tarefas." retry={() => void tasks.refetch()} /></div> :
        items.length === 0 ?
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="mb-5 rounded-xl border bg-sidebar p-3"><CheckSquareIcon className="size-6" weight="regular" /></span>
            <h2 className="font-medium">{filter === "all" ? "Seu próximo passo começa aqui" : filter === "pending" ? "Nenhuma tarefa pendente" : "Ainda não há tarefas concluídas"}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{filter === "all" ? "Crie sua primeira tarefa. Você pode adicionar detalhes e marcar como concluída quando terminar." : "Use os filtros para acompanhar suas outras tarefas."}</p>
            <Button className="mt-5" variant="outline" size="sm" onClick={() => filter === "all" ? openEditor("new") : onFilter("all")}>{filter === "all" ? "Criar primeira tarefa" : "Ver todas as tarefas"}</Button>
          </div> : <>
            <div aria-hidden="true" className="hidden items-center gap-3 border-b bg-sidebar px-4 py-2.5 text-[11px] font-medium text-muted-foreground sm:flex">
              <span className="w-10 shrink-0" /><span className="flex-1">Tarefa</span><span className="w-24">Estado</span><span className="hidden w-28 lg:block">Criada em</span><span className="w-[72px] text-right">Ações</span>
            </div>
            <ul>
              {items.map((task) => <TaskItem key={task.id} task={task}
                pending={status.isPending && status.variables?.id === task.id}
                onStatus={(item) => { status.mutate({ id: item.id, status: item.status === "pending" ? "completed" : "pending" }); }}
                onEdit={openEditor}
                onDelete={(item) => { remove.reset(); setDeleting(item); }} />)}
            </ul>
            {(tasks.hasNextPage || tasks.isFetchingNextPage || tasks.isFetchNextPageError) && <footer className="border-t px-4 py-4">
              <InfiniteScroll hasNextPage={tasks.hasNextPage} isFetching={tasks.isFetching}
                isFetchingNextPage={tasks.isFetchingNextPage} error={tasks.isFetchNextPageError} paused={tasks.isRefetchError}
                onLoadMore={loadMore} />
            </footer>}
          </>}
    </section>

    {editor !== null && <Modal title={editor === "new" ? "Nova tarefa" : "Editar tarefa"} description={editor === "new" ? "O que você quer realizar?" : "Atualize o título e os detalhes da tarefa."} pending={saving} onClose={() => setEditor(null)}>
      <TaskForm key={editor === "new" ? "new" : editor.id} {...(editor === "new" ? {} : { initial: editor })} pending={saving} error={editorError ? errorMessage(editorError) : null}
        onCancel={() => setEditor(null)} onSubmit={(fields) => editor === "new" ? create.mutate(fields) : edit.mutate({ id: editor.id, ...fields })} />
    </Modal>}
    {deleting && <Modal variant="confirmation" title="Excluir tarefa?" description="Esta ação é permanente e não pode ser desfeita." pending={remove.isPending} onClose={() => setDeleting(null)}>
      <p className="mb-6 break-words rounded-lg border bg-sidebar p-4 text-sm font-medium">{deleting.title}</p>
      {remove.error && <div className="mb-4"><ErrorNotice message={errorMessage(remove.error)} /></div>}
      <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto"><Button data-modal-autofocus variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancelar</Button><Button disabled={remove.isPending} onClick={() => remove.mutate({ id: deleting.id })}>{remove.isPending ? "Excluindo…" : "Excluir tarefa"}</Button></div>
    </Modal>}
  </div>;
}
