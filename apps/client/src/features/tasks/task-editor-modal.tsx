import { useMutation } from "@tanstack/react-query";
import { useRefreshSessionOnAuthError } from "@/components/permission-boundary";
import { Modal } from "@/components/ui/modal";
import { actionErrorMessage } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { type Task, useTasksRefresh } from "./queries";
import { TaskForm } from "./task-form";

// Criar e editar compartilham formulário, estados e invalidação: um só diálogo.
export function TaskEditorModal({
  task,
  onClose,
  onCreated,
}: {
  task: Task | "new";
  onClose: () => void;
  onCreated: () => void;
}) {
  const refresh = useTasksRefresh();
  const creating = task === "new";
  const save = useMutation({
    mutationFn: (input: Parameters<typeof rpc.tasks.create>[0]) =>
      creating
        ? rpc.tasks.create(input)
        : rpc.tasks.update({ ...input, id: task.id }),
    onSuccess: async () => {
      onClose();
      if (creating) {
        onCreated();
      }
      await refresh();
    },
  });
  useRefreshSessionOnAuthError([save.error]);
  return (
    <Modal
      description={
        creating
          ? "O que precisa ser feito e quem responde por isso?"
          : "Atualize o título, os detalhes e o responsável."
      }
      onClose={onClose}
      pending={save.isPending}
      title={creating ? "Nova tarefa" : "Editar tarefa"}
    >
      <TaskForm
        {...(creating ? {} : { initial: task })}
        error={save.error ? actionErrorMessage(save.error) : null}
        onCancel={onClose}
        onSubmit={({ mentions, ...fields }) =>
          save.mutate({ ...fields, mentions: mentions.map((user) => user.id) })
        }
        pending={save.isPending}
      />
    </Modal>
  );
}
