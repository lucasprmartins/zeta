import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorNotice } from "@/components/feedback";
import { useUserId } from "@/components/permission-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { rpc } from "@/lib/rpc";
import { supportStatusQuery } from "./queries";

export function SupportSettings() {
  const userId = useUserId();
  const client = useQueryClient();
  const status = useQuery(supportStatusQuery(userId));
  const [editing, setEditing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [token, setToken] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const configured = status.data?.configured ?? false;
  const showForm = status.isSuccess && (!configured || editing);
  function reset() {
    setWebhookUrl("");
    setToken("");
    setSourceName("");
    setEditing(false);
    setError(null);
  }
  async function save(remove: boolean) {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      // URL e credencial não entram no cache de mutations.
      const saved = await rpc.support.save(
        remove
          ? { webhookUrl: null }
          : {
              webhookUrl: webhookUrl.trim(),
              token: token.trim() || null,
              sourceName: sourceName.trim(),
            }
      );
      client.setQueryData(supportStatusQuery(userId).queryKey, saved);
      reset();
      toast.success(
        remove
          ? "Suporte técnico desativado."
          : "Configuração do suporte salva."
      );
      await client.invalidateQueries({ queryKey: ["support", userId] });
    } catch {
      setError(
        "Não foi possível salvar o suporte. Verifique o endereço HTTPS público, seu acesso e tente novamente."
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <section className="space-y-5 border-t p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Suporte técnico</h3>
        {status.isSuccess && (
          <Badge variant={configured ? "default" : "outline"}>
            {configured ? "Ativado" : "Desativado"}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Envie solicitações dos usuários para sua gestão de projetos. O
        recebimento só será confirmado quando o webhook responder HTTP 200.
      </p>
      {status.isPending && (
        <p className="text-muted-foreground text-sm" role="status">
          Carregando configuração…
        </p>
      )}
      {status.isError && (
        <ErrorNotice
          message="Não foi possível carregar o suporte."
          retry={() => void status.refetch()}
        />
      )}
      {showForm && (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save(false);
          }}
        >
          <fieldset className="space-y-5" disabled={saving}>
            <Field>
              <FieldLabel htmlFor="support-source">
                Nome do sistema ou cliente
              </FieldLabel>
              <Input
                autoComplete="off"
                id="support-source"
                maxLength={120}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Nome do sistema ou cliente"
                required
                value={sourceName}
              />
              <FieldDescription>
                Identifica a origem dos tickets recebidos pela sua equipe.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="support-webhook">URL do webhook</FieldLabel>
              <Input
                autoComplete="off"
                id="support-webhook"
                maxLength={2048}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://api.exemplo.com/tickets"
                required
                type="url"
                value={webhookUrl}
              />
              <FieldDescription>
                Use um endereço HTTPS público. A URL salva não será exibida
                novamente.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="support-token">
                Token de autenticação (opcional)
              </FieldLabel>
              <Input
                autoComplete="new-password"
                id="support-token"
                maxLength={1024}
                onChange={(event) => setToken(event.target.value)}
                type="password"
                value={token}
              />
              <FieldDescription>
                Enviado como Bearer token. Ao substituir a configuração,
                preencha novamente para usar autenticação; deixar vazio salva
                sem token.
              </FieldDescription>
            </Field>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={saving || !webhookUrl.trim() || !sourceName.trim()}
              type="submit"
            >
              {saving ? "Salvando…" : "Salvar suporte"}
            </Button>
            {configured && (
              <Button disabled={saving} onClick={reset} variant="ghost">
                Cancelar
              </Button>
            )}
          </div>
        </form>
      )}
      {configured && !editing && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={saving} onClick={() => setEditing(true)}>
            Substituir configuração
          </Button>
          <Button
            disabled={saving}
            onClick={() => void save(true)}
            variant="outline"
          >
            {saving ? "Desativando…" : "Desativar suporte"}
          </Button>
        </div>
      )}
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
