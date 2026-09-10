import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { MAX_GUIDE_MARKDOWN } from "@zeta/guide-content";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/confirm-modal";
import { ErrorNotice, Loading } from "@/components/feedback";
import { BackLink } from "@/components/layout/back-link";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { useUserId } from "@/components/permission-boundary";
import { PermissionPicker } from "@/components/permission-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Radio } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { catalog } from "@/lib/access";
import { actionErrorMessage } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { BlockEditor } from "./block-editor";
import { GuideContent, useGuideBlocks } from "./content";
import { type Guide, guideEditQuery, guideKeys } from "./queries";

function EditorForm({ initial }: { initial: Guide | null }) {
  const userId = useUserId();
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
  const parsed = useGuideBlocks(draft.markdown);
  const [restricted, setRestricted] = useState(
    (initial?.draft.permissions.length ?? 0) > 0
  );
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);
  const save = useMutation({
    mutationFn: (action: "draft" | "publish" | "unpublish") =>
      rpc.guides.save({
        slug,
        draft,
        action,
        ...(saved ? { version: saved.version } : {}),
      }),
    onSuccess: async (result, action) => {
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
    onError: (error) => toast.error(actionErrorMessage(error)),
  });
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
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
    draft.markdown.length <= MAX_GUIDE_MARKDOWN;
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
            {draft.markdown.length <= MAX_GUIDE_MARKDOWN ? (
              <GuideContent parsed={parsed} />
            ) : (
              <ErrorNotice
                message={`Reduza o conteúdo para até ${MAX_GUIDE_MARKDOWN.toLocaleString("pt-BR")} caracteres.`}
              />
            )}
          </div>
        )}
        {draft.markdown.length > MAX_GUIDE_MARKDOWN && (
          <ErrorNotice
            message={`O conteúdo ultrapassa o limite de ${MAX_GUIDE_MARKDOWN.toLocaleString("pt-BR")} caracteres.`}
          />
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
              <Radio
                checked={!restricted}
                disabled={save.isPending}
                name="guide-audience"
                onChange={() => {
                  setRestricted(false);
                  update("permissions", []);
                }}
              />
              <span className="font-medium text-sm">Todos os usuários</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Radio
                checked={restricted}
                disabled={save.isPending}
                name="guide-audience"
                onChange={() => setRestricted(true)}
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

      {save.error && <ErrorNotice message={actionErrorMessage(save.error)} />}
      {blocker.status === "blocked" && (
        <ConfirmModal
          cancelLabel="Continuar editando"
          confirmLabel="Sair sem salvar"
          description="As alterações não salvas serão perdidas."
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
          pending={save.isPending}
          pendingLabel="Saindo…"
          title="Sair sem salvar?"
        />
      )}
    </PageContent>
  );
}
export function GuideEditorPage({ slug }: { slug?: string }) {
  const query = useQuery({
    ...guideEditQuery(useUserId(), slug ?? ""),
    enabled: !!slug,
    refetchOnWindowFocus: false,
  });
  if (!slug) {
    return <EditorForm initial={null} />;
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
  return <EditorForm initial={query.data} key={slug} />;
}
