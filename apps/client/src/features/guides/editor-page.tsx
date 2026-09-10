import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { Loading, ErrorNotice } from "@/components/feedback";
import { catalog } from "@/lib/access";
import { rpc } from "@/lib/rpc";
import { accessError } from "@/features/access/queries";
import { BlockEditor } from "./block-editor";
import { GuideContent } from "./content";
import { guideEditQuery, guideKeys, type Guide } from "./queries";

function EditorForm({ userId, initial }: { userId: string; initial: Guide | null }) {
  const client = useQueryClient(), navigate = useNavigate();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [draft, setDraft] = useState(initial?.draft ?? { title: "", section: "Geral", order: 0, markdown: "", permission: null });
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const unsaved = useRef(false);
  const markDirty = () => { unsaved.current = true; setDirty(true); };
  const save = useMutation({ mutationFn: (action: "draft" | "publish" | "unpublish") => rpc.guides.save({ slug, draft, action, ...(saved ? { version: saved.version } : {}) }), onSuccess: async (result, action) => {
    unsaved.current = false; setDirty(false); setSaved(result);
    client.setQueryData(guideEditQuery(userId, result.slug).queryKey, result);
    toast.success(action === "publish" ? "Guia publicado." : action === "unpublish" ? "Guia retirado de publicação." : "Rascunho salvo.");
    await client.invalidateQueries({ queryKey: guideKeys.all(userId) });
    if (!initial) await navigate({ to: "/admin/guides/edit/$slug", params: { slug: result.slug }, replace: true });
  }, onError: (error) => toast.error(accessError(error)) });
  const blocker = useBlocker({ shouldBlockFn: () => unsaved.current, enableBeforeUnload: () => unsaved.current, withResolver: true });
  const update = <K extends keyof Guide["draft"]>(key: K, value: Guide["draft"][K]) => { markDirty(); setDraft((old) => ({ ...old, [key]: value })); };
  const canSave = !!draft.title.trim() && !!draft.section.trim() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && draft.markdown.length <= 50000;
  return <PageContent><Link to="/admin/guides" className="w-fit py-2 text-sm text-muted-foreground hover:text-foreground">← Administrar guias</Link>
    <PageHeader title={saved ? "Editar guia" : "Novo guia"} description={saved?.published ? "A versão publicada só muda quando você publicar novamente." : "Salve um rascunho e publique quando estiver pronto."} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-5" aria-label="Conteúdo do guia">
        <Field><FieldLabel htmlFor="guide-title">Título do guia</FieldLabel><Input id="guide-title" value={draft.title} maxLength={120} disabled={save.isPending} onChange={(event) => update("title", event.target.value)} required /></Field>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Conteúdo</h2><Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>{preview ? "Voltar à edição" : "Prévia"}</Button></div>
        <div className={preview ? "hidden" : ""}><BlockEditor initial={initial?.draft.markdown ?? ""} disabled={save.isPending} onChange={(markdown) => update("markdown", markdown)} /></div>
        {preview && <div className="min-h-80 rounded-lg border p-5 sm:p-8">{draft.markdown.length <= 50000 ? <GuideContent markdown={draft.markdown} /> : <ErrorNotice message="Reduza o conteúdo para até 50 mil caracteres." />}</div>}
        {draft.markdown.length > 50000 && <ErrorNotice message="O conteúdo ultrapassa o limite de 50 mil caracteres." />}
      </section>
      <aside className="space-y-5 rounded-lg border p-5 self-start" aria-label="Organização e publicação">
        <h2 className="text-sm font-medium">Organização</h2>
        <Field><FieldLabel htmlFor="guide-slug">Identificador</FieldLabel><Input id="guide-slug" value={slug} maxLength={100} disabled={!!saved || save.isPending} placeholder="primeiros-passos" onChange={(event) => { markDirty(); setSlug(event.target.value); }} /><FieldDescription>Usado na URL e na importação. Não muda após o primeiro salvamento.</FieldDescription></Field>
        <Field><FieldLabel htmlFor="guide-section">Seção</FieldLabel><Input id="guide-section" value={draft.section} maxLength={80} disabled={save.isPending} onChange={(event) => update("section", event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="guide-order">Ordem na seção</FieldLabel><Input id="guide-order" type="number" min={0} max={10000} value={draft.order} disabled={save.isPending} onChange={(event) => update("order", Number(event.target.value))} /></Field>
        <Field><FieldLabel htmlFor="guide-permission">Quem pode ler</FieldLabel><NativeSelect id="guide-permission" value={draft.permission ?? ""} disabled={save.isPending} onChange={(event) => update("permission", event.target.value || null)}><NativeSelectOption value="">Todos os usuários</NativeSelectOption>{catalog.flatMap((group) => group.actions.map((action) => <NativeSelectOption key={action.id} value={action.id}>{group.label} — {action.label}</NativeSelectOption>))}</NativeSelect><FieldDescription>A restrição será aplicada à versão publicada.</FieldDescription></Field>
        <div className="space-y-2 border-t pt-5"><Button className="w-full" variant="outline" disabled={!canSave || save.isPending} onClick={() => save.mutate("draft")}>Salvar rascunho</Button><Button className="w-full" disabled={!canSave || !draft.markdown.trim() || save.isPending} onClick={() => save.mutate("publish")}>{save.isPending ? "Salvando…" : "Publicar"}</Button>{saved?.published && <Button className="w-full" variant="ghost" disabled={save.isPending} onClick={() => save.mutate("unpublish")}>Retirar de publicação</Button>}</div>
        <p className="text-xs text-muted-foreground" role="status">{dirty ? "Há alterações não salvas." : saved ? "Alterações salvas." : "Ainda não salvo."}</p>
      </aside>
    </div>
    {save.error && <ErrorNotice message={accessError(save.error)} />}
    {blocker.status === "blocked" && <Modal title="Sair sem salvar?" description="As alterações não salvas serão perdidas." variant="confirmation" pending={save.isPending} onClose={() => blocker.reset()}><div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button variant="outline" disabled={save.isPending} onClick={() => blocker.reset()}>Continuar editando</Button><Button disabled={save.isPending} onClick={() => blocker.proceed()}>Sair sem salvar</Button></div></Modal>}
  </PageContent>;
}
export function GuideEditorPage({ userId, slug }: { userId: string; slug?: string }) {
  const query = useQuery({ ...guideEditQuery(userId, slug ?? ""), enabled: !!slug, refetchOnWindowFocus: false });
  if (!slug) return <EditorForm userId={userId} initial={null} />;
  if (query.isPending) return <Loading />;
  if (query.isError) return <PageContent><ErrorNotice message="Não foi possível carregar o guia." retry={() => void query.refetch()} /></PageContent>;
  return <EditorForm key={slug} userId={userId} initial={query.data} />;
}
