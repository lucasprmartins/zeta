import { useMutation } from "@tanstack/react-query";
import { ConfirmModal } from "@/components/confirm-modal";
import { useRefreshSessionOnAuthError } from "@/components/permission-boundary";
import { actionErrorMessage } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { type Task, useTasksRefresh } from "./queries";

export function DeleteTaskModal({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const refresh = useTasksRefresh();
  const remove = useMutation({
    mutationFn: () => rpc.tasks.delete({ id: task.id }),
    onSuccess: async () => {
      onClose();
      await refresh();
    },
  });
  useRefreshSessionOnAuthError([remove.error]);
  return (
    <ConfirmModal
      confirmLabel="Excluir tarefa"
      description="Esta ação é permanente e não pode ser desfeita."
      error={remove.error ? actionErrorMessage(remove.error) : undefined}
      onClose={onClose}
      onConfirm={() => remove.mutate()}
      pending={remove.isPending}
      pendingLabel="Excluindo…"
      title="Excluir tarefa?"
    >
      <p className="mb-6 break-words rounded-lg border bg-sidebar p-4 font-medium text-sm">
        {task.title}
      </p>
    </ConfirmModal>
  );
}
