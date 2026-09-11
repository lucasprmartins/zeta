import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { useUserId } from "@/components/permission-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { helpStatusQuery } from "@/features/help/queries";
import { rpc } from "@/lib/rpc";

export function HelpSettings() {
  const userId = useUserId();
  const status = useQuery(helpStatusQuery(userId));
  return (
    <Card className="overflow-hidden">
      <div className="border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Ajuda com IA</h2>
          {status.isSuccess && (
            <Badge
              role="status"
              variant={status.data.configured ? "default" : "outline"}
            >
              {status.data.configured ? "Ativada" : "Desativada"}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          Respostas baseadas no Guia de Uso, com GPT-5.6 Luna.
        </p>
      </div>
      {status.isPending ? (
        <Loading />
      ) : status.isError ? (
        <div className="p-5 sm:p-6">
          <ErrorNotice
            message="Não foi possível carregar a configuração."
            retry={() => void status.refetch()}
          />
        </div>
      ) : (
        <HelpKeyForm configured={status.data.configured} />
      )}
    </Card>
  );
}

function HelpKeyForm({ configured }: { configured: boolean }) {
  const userId = useUserId();
  const client = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showSavedKey = configured && !editing;
  useEffect(() => {
    if (editing) {
      input.current?.focus();
    }
  }, [editing]);
  async function save(value: string | null) {
    setSaving(true);
    setError(null);
    try {
      // O segredo não entra no cache de mutations.
      const saved = await rpc.help.save({ apiKey: value });
      client.setQueryData(helpStatusQuery(userId).queryKey, saved);
      setApiKey("");
      setEditing(false);
      toast.success(
        value === null ? "Chave removida." : "Chave da OpenAI salva."
      );
      await client.invalidateQueries({ queryKey: ["help", userId] });
    } catch {
      setError(
        "Não foi possível salvar a configuração. Verifique seu acesso e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className="space-y-5 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!(saving || showSavedKey) && apiKey.trim().length >= 20) {
          void save(apiKey.trim());
        }
      }}
    >
      <p className="text-muted-foreground text-sm">
        {configured
          ? "A ajuda com IA está ativada. Você pode substituir ou remover a chave salva."
          : "Adicione uma chave para ativar o assistente. Enquanto isso, a Ajuda exibe o acesso ao Guia de Uso."}
      </p>
      <Field>
        <FieldLabel htmlFor="openai-api-key">OpenAI API Key</FieldLabel>
        <Input
          aria-describedby="openai-key-help"
          autoComplete="off"
          disabled={saving}
          id="openai-api-key"
          maxLength={512}
          minLength={20}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Insira sua OpenAI API Key (sk-…)"
          readOnly={showSavedKey}
          ref={input}
          spellCheck={false}
          type="password"
          value={showSavedKey ? "••••••••••••••••••••••••" : apiKey}
        />
        <FieldDescription id="openai-key-help">
          {showSavedKey
            ? "Chave salva com segurança. O campo mostra apenas uma máscara de proteção."
            : "A chave será armazenada com segurança e aparecerá protegida após salvar."}
        </FieldDescription>
      </Field>
      {error && <ErrorNotice message={error} />}
      <div className="flex flex-wrap gap-3">
        {showSavedKey ? (
          <Button
            disabled={saving}
            onClick={() => {
              setApiKey("");
              setError(null);
              setEditing(true);
            }}
          >
            Substituir chave
          </Button>
        ) : (
          <Button disabled={saving || apiKey.trim().length < 20} type="submit">
            {saving ? "Salvando…" : "Salvar chave"}
          </Button>
        )}
        {editing && configured && (
          <Button
            disabled={saving}
            onClick={() => {
              setApiKey("");
              setError(null);
              setEditing(false);
            }}
            variant="ghost"
          >
            Cancelar
          </Button>
        )}
        {configured && (
          <Button
            disabled={saving}
            onClick={() => void save(null)}
            variant="outline"
          >
            Remover chave
          </Button>
        )}
      </div>
    </form>
  );
}
