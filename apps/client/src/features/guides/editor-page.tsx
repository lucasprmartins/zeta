import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { BackLink } from "@/components/layout/back-link";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PermissionPicker } from "@/features/access/permission-picker";
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
  const [draft, setDraft] = useState<Guide["draft"]>(
    initial?.draft ?? {
      title: "",
      section: "Geral",
      order: 0,
      markdown: "",
      permissions: [],
    }
  );
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [restricted, setRestricted] = useState(
    (initial?.draft.permissions.length ?? 0) > 0
  );
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
          to: "/help/guides/edit/$slug",
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
      <BackLink to="/help/guides">Guia de uso</BackLink>
      <div className="space-y-2">
        <PageHeader
          actions={
            <>
              <Button
                disabled={!canSave || save.isPending}
                onClick={() => save.mutate("draft")}
                variant="outline"
              >
                Salvar rascunho
              </Button>
              <Button
                disabled={!(canSave && draft.markdown.trim()) || save.isPending}
                onClick={() => save.mutate("publish")}
              >
                {save.isPending ? "Salvando…" : "Publicar"}
              </Button>
            </>
          }
          description="Salve um rascunho quantas vezes quiser; publicar substitui o que os leitores veem."
          eyebrow={
            <Badge variant={saved?.published ? "outline" : "secondary"}>
              {saved?.published ? "Publicado" : "Rascunho"}
            </Badge>
          }
          title={saved ? "Editar guia" : "Novo guia"}
        />
        <p className="text-muted-foreground text-xs" role="status">
          {dirty
            ? "Há alterações não salvas."
            : saved
              ? "Alterações salvas."
              : "Ainda não salvo."}
        </p>
      </div>

      {/* O conteúdo ocupa a largura da leitura; as decisões de catálogo vêm depois dele. */}
      <section aria-label="Conteúdo do guia" className="max-w-4xl space-y-5">
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

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Onde o guia aparece</CardTitle>
          <CardDescription>
            A seção agrupa os guias na listagem e a ordem define a posição
            dentro dela.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
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
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="guide-slug">Endereço do guia</FieldLabel>
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
              Compõe a URL e liga o guia aos arquivos da importação. Não muda
              após o primeiro salvamento.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Quem pode ler</CardTitle>
          <CardDescription>
            A restrição vale para a versão publicada. Rascunhos ficam visíveis
            apenas para quem administra os guias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                checked={!restricted}
                className="size-5 shrink-0 accent-foreground"
                disabled={save.isPending}
                name="guide-audience"
                onChange={() => {
                  setRestricted(false);
                  update("permissions", []);
                }}
                type="radio"
              />
              <span className="font-medium text-sm">Todos os usuários</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                checked={restricted}
                className="size-5 shrink-0 accent-foreground"
                disabled={save.isPending}
                name="guide-audience"
                onChange={() => setRestricted(true)}
                type="radio"
              />
              <span className="font-medium text-sm">
                Somente quem tem uma destas permissões
              </span>
            </label>
          </div>
          {restricted && (
            <>
              {draft.permissions.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Marque ao menos uma permissão; sem nenhuma, o guia continua
                  liberado para todos os usuários.
                </p>
              )}
              <PermissionPicker
                catalog={catalog}
                disabled={save.isPending}
                grants={draft.permissions}
                onChange={(next) => update("permissions", next)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {saved?.published && (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Publicação</CardTitle>
            <CardDescription>
              A versão publicada só muda quando você publicar novamente. Retirar
              de publicação oculta o guia dos leitores e preserva o rascunho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full sm:w-auto"
              disabled={save.isPending}
              onClick={() => save.mutate("unpublish")}
              variant="outline"
            >
              Retirar de publicação
            </Button>
          </CardContent>
        </Card>
      )}

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
