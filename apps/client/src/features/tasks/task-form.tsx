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
      <div className="space-y-2"><label htmlFor={`${id}-title`} className="text-sm font-medium">Título</label><Input data-modal-autofocus id={`${id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O que precisa ser feito?" required maxLength={120} /></div>
      <div className="space-y-2"><label htmlFor={`${id}-description`} className="text-sm font-medium">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Adicione os detalhes necessários…" maxLength={2000} rows={6} className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base sm:text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-50" /></div>
    </fieldset>
    {error && <ErrorNotice message={error} />}
    <div className="modal-actions sticky bottom-0 flex flex-col gap-2 border-t bg-background pt-4 sm:flex-row-reverse [&>button]:w-full sm:[&>button]:w-auto"><Button type="submit" disabled={pending || !title.trim()}>{pending ? "Salvando…" : initial ? "Salvar alterações" : "Criar tarefa"}</Button>{onCancel && <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>}</div>
  </form>;
}
