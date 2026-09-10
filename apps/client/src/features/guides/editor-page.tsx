import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { accessError } from "@/features/access/queries";
import { catalog } from "@/lib/access";
import { rpc } from "@/lib/rpc";
import { BlockEditor } from "./block-editor";
import { GuideContent } from "./content";
import { type Guide, guideEditQuery, guideKeys } from "./queries";

function EditorForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Guide | null;
}) {
  const client = useQueryClient(),
    navigate = useNavigate();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [draft, setDraft] = useState(
    initial?.draft ?? {
      title: "",
      section: "Geral",
      order: 0,
      markdown: "",
      permission: null,
    }
  );
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const unsaved = useRef(false);
  const markDirty = () => {
    unsaved.current = true;
    setDirty(true);
  };
  const save = useMutation({
    mutationFn: (action: "draft" | "publish" | "unpublish") =>
      rpc.guides.save({
        slug,
        draft,
        action,
        ...(saved ? { version: saved.version } : {}),
      }),
    onSuccess: async (result, action) => {
      unsaved.current = false;
      setDirty(false);
      setSaved(result);
      client.setQueryData(guideEditQuery(userId, result.slug).queryKey, result);
      toast.success(
        action === "publish"
          ? "Guia publicado."
          : action === "unpublish"
            ? "Guia retirado de publicação."
            : "Rascunho salvo."
      );
      await client.invalidateQueries({ queryKey: guideKeys.all(userId) });
      if (!initial) {
        await navigate({
          to: "/admin/guides/edit/$slug",
          params: { slug: result.slug },
          replace: true,
        });
      }
    },
    onError: (error) => toast.error(accessError(error)),
  });
  const blocker = useBlocker({
    shouldBlockFn: () => unsaved.current,
    enableBeforeUnload: () => unsaved.current,
    withResolver: true,
  });
  const update = <K extends keyof Guide["draft"]>(
    key: K,
    value: Guide["draft"][K]
  ) => {
    markDirty();
    setDraft((old) => ({ ...old, [key]: value }));
  };
  const canSave =
    !!draft.title.trim() &&
    !!draft.section.trim() &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    draft.markdown.length <= 50_000;
  return (
    <PageContent>
      <Link
        className="w-fit py-2 text-muted-foreground text-sm hover:text-foreground"
        to="/admin/guides"
      >
        ← Administrar guias
      </Link>
      <PageHeader
        description={
          saved?.published
            ? "A versão publicada só muda quando você publicar novamente."
            : "Salve um rascunho e publique quando estiver pronto."
        }
        title={saved ? "Editar guia" : "Novo guia"}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-label="Conteúdo do guia" className="min-w-0 space-y-5">
          <Field>
            <FieldLabel htmlFor="guide-title">Título do guia</FieldLabel>
            <Input
              disabled={save.isPending}
              id="guide-title"
              maxLength={120}
              onChange={(event) => update("title", event.target.value)}
              required
              value={draft.title}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-sm">Conteúdo</h2>
            <Button
              onClick={() => setPreview(!preview)}
              size="sm"
              variant="outline"
            >
              {preview ? "Voltar à edição" : "Prévia"}
            </Button>
          </div>
          <div className={preview ? "hidden" : ""}>
            <BlockEditor
              disabled={save.isPending}
              initial={initial?.draft.markdown ?? ""}
              onChange={(markdown) => update("markdown", markdown)}
            />
          </div>
          {preview && (
            <div className="min-h-80 rounded-lg border p-5 sm:p-8">
              {draft.markdown.length <= 50_000 ? (
                <GuideContent markdown={draft.markdown} />
              ) : (
                <ErrorNotice message="Reduza o conteúdo para até 50 mil caracteres." />
              )}
            </div>
          )}
          {draft.markdown.length > 50_000 && (
            <ErrorNotice message="O conteúdo ultrapassa o limite de 50 mil caracteres." />
          )}
        </section>
        <aside
          aria-label="Organização e publicação"
          className="space-y-5 self-start rounded-lg border p-5"
        >
          <h2 className="font-medium text-sm">Organização</h2>
          <Field>
            <FieldLabel htmlFor="guide-slug">Identificador</FieldLabel>
            <Input
              disabled={!!saved || save.isPending}
              id="guide-slug"
              maxLength={100}
              onChange={(event) => {
                markDirty();
                setSlug(event.target.value);
              }}
              placeholder="primeiros-passos"
              value={slug}
            />
            <FieldDescription>
              Usado na URL e na importação. Não muda após o primeiro salvamento.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="guide-section">Seção</FieldLabel>
            <Input
              disabled={save.isPending}
              id="guide-section"
              maxLength={80}
              onChange={(event) => update("section", event.target.value)}
              value={draft.section}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="guide-order">Ordem na seção</FieldLabel>
            <Input
              disabled={save.isPending}
              id="guide-order"
              max={10_000}
              min={0}
              onChange={(event) => update("order", Number(event.target.value))}
              type="number"
              value={draft.order}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="guide-permission">Quem pode ler</FieldLabel>
            <NativeSelect
              disabled={save.isPending}
              id="guide-permission"
              onChange={(event) =>
                update("permission", event.target.value || null)
              }
              value={draft.permission ?? ""}
            >
              <NativeSelectOption value="">
                Todos os usuários
              </NativeSelectOption>
              {catalog.flatMap((group) =>
                group.actions.map((action) => (
                  <NativeSelectOption key={action.id} value={action.id}>
                    {group.label} — {action.label}
                  </NativeSelectOption>
                ))
              )}
            </NativeSelect>
            <FieldDescription>
              A restrição será aplicada à versão publicada.
            </FieldDescription>
          </Field>
          <div className="space-y-2 border-t pt-5">
            <Button
              className="w-full"
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate("draft")}
              variant="outline"
            >
              Salvar rascunho
            </Button>
            <Button
              className="w-full"
              disabled={!(canSave && draft.markdown.trim()) || save.isPending}
              onClick={() => save.mutate("publish")}
            >
              {save.isPending ? "Salvando…" : "Publicar"}
            </Button>
            {saved?.published && (
              <Button
                className="w-full"
                disabled={save.isPending}
                onClick={() => save.mutate("unpublish")}
                variant="ghost"
              >
                Retirar de publicação
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs" role="status">
            {dirty
              ? "Há alterações não salvas."
              : saved
                ? "Alterações salvas."
                : "Ainda não salvo."}
          </p>
        </aside>
      </div>
      {save.error && <ErrorNotice message={accessError(save.error)} />}
      {blocker.status === "blocked" && (
        <Modal
          description="As alterações não salvas serão perdidas."
          onClose={() => blocker.reset()}
          pending={save.isPending}
          title="Sair sem salvar?"
          variant="confirmation"
        >
          <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              disabled={save.isPending}
              onClick={() => blocker.reset()}
              variant="outline"
            >
              Continuar editando
            </Button>
            <Button disabled={save.isPending} onClick={() => blocker.proceed()}>
              Sair sem salvar
            </Button>
          </div>
        </Modal>
      )}
    </PageContent>
  );
}
export function GuideEditorPage({
  userId,
  slug,
}: {
  userId: string;
  slug?: string;
}) {
  const query = useQuery({
    ...guideEditQuery(userId, slug ?? ""),
    enabled: !!slug,
    refetchOnWindowFocus: false,
  });
  if (!slug) {
    return <EditorForm initial={null} userId={userId} />;
  }
  if (query.isPending) {
    return <Loading />;
  }
  if (query.isError) {
    return (
      <PageContent>
        <ErrorNotice
          message="Não foi possível carregar o guia."
          retry={() => void query.refetch()}
        />
      </PageContent>
    );
  }
  return <EditorForm initial={query.data} key={slug} userId={userId} />;
}
