import { type FormEvent, useId, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { usePermissions } from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { permissions } from "@/lib/access";
import { MentionPicker } from "./mention-picker";
import type { TaskUser } from "./queries";

type Fields = { title: string; description: string; mentions: TaskUser[] };
export function TaskForm({
  initial,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Fields;
  pending: boolean;
  error: string | null;
  onSubmit: (fields: Fields) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const { can } = usePermissions();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mentions, setMentions] = useState<TaskUser[]>(initial?.mentions ?? []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!pending && title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        mentions,
      });
    }
  }
  return (
    <form className="flex min-h-full flex-col gap-4" onSubmit={submit}>
      <fieldset className="flex-1 space-y-4" disabled={pending}>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Título</FieldLabel>
          <Input
            data-modal-autofocus
            id={`${id}-title`}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="O que precisa ser feito?"
            required
            value={title}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-description`}>
            Descrição{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Textarea
            id={`${id}-description`}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Adicione os detalhes necessários…"
            rows={6}
            value={description}
          />
        </Field>
        {can(permissions.tasks.mention) && (
          <MentionPicker
            disabled={pending}
            onChange={setMentions}
            value={mentions}
          />
        )}
      </fieldset>
      {error && <ErrorNotice message={error} />}
      <div className="modal-actions sticky bottom-0 border-t bg-background pt-4 [&>button]:w-full sm:[&>button]:w-auto">
        {onCancel && (
          <Button
            disabled={pending}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
        )}
        <Button disabled={pending || !title.trim()} type="submit">
          {pending
            ? "Salvando…"
            : initial
              ? "Salvar alterações"
              : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}
