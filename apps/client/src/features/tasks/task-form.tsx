import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/feedback";

type Fields = { title: string; description: string };
export function TaskForm({ initial, pending, error, onSubmit, onCancel }: {
  initial?: Fields; pending: boolean; error: string | null;
  onSubmit: (fields: Fields) => void; onCancel?: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!pending && title.trim()) onSubmit({ title: title.trim(), description: description.trim() });
  }
  return <form onSubmit={submit} className="flex min-h-full flex-col gap-4">
    <fieldset disabled={pending} className="flex-1 space-y-4">
      <Field><FieldLabel htmlFor={`${id}-title`}>Título</FieldLabel><Input data-modal-autofocus id={`${id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O que precisa ser feito?" required maxLength={120} /></Field>
      <Field><FieldLabel htmlFor={`${id}-description`}>Descrição <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel><Textarea id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Adicione os detalhes necessários…" maxLength={2000} rows={6} /></Field>
    </fieldset>
    {error && <ErrorNotice message={error} />}
    <div className="modal-actions sticky bottom-0 flex flex-col gap-2 border-t bg-background pt-4 sm:flex-row-reverse [&>button]:w-full sm:[&>button]:w-auto"><Button type="submit" disabled={pending || !title.trim()}>{pending ? "Salvando…" : initial ? "Salvar alterações" : "Criar tarefa"}</Button>{onCancel && <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>}</div>
  </form>;
}
