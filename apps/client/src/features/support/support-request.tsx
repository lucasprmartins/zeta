import { ArrowRightIcon, HeadsetIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useUserId } from "@/components/permission-boundary";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { actionErrorMessage } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { supportStatusQuery } from "./queries";
import { supportAttachmentsError, supportPagePath } from "./request-fields";

const types = [
  ["error", "Erro"],
  ["feature", "Funcionalidade"],
  ["optimization", "Otimização"],
  ["question", "Dúvida"],
  ["suggestion", "Sugestão"],
] as const;
const priorities = [
  ["low", "Baixa"],
  ["normal", "Normal"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
] as const;

export function SupportRequest({
  presentation = "card",
  prominent = false,
}: {
  presentation?: "card" | "button";
  prominent?: boolean;
}) {
  const status = useQuery(supportStatusQuery(useUserId()));
  const [open, setOpen] = useState(false);
  const unavailable = status.isSuccess && !status.data.configured;
  const feedback = status.isError ? (
    <ErrorNotice
      message="Não foi possível verificar a disponibilidade do suporte."
      retry={() => void status.refetch()}
    />
  ) : null;
  const action = (
    <Button
      className={
        presentation === "card"
          ? "w-full sm:w-auto"
          : prominent
            ? undefined
            : "text-muted-foreground"
      }
      disabled={!status.data?.configured}
      onClick={() => setOpen(true)}
      title={unavailable ? "O suporte ainda não foi configurado." : undefined}
      variant={
        presentation === "card" ? "outline" : prominent ? "soft" : "ghost"
      }
    >
      {presentation === "button" && (
        <HeadsetIcon aria-hidden="true" weight="regular" />
      )}
      Solicitar suporte
      {presentation === "card" && (
        <ArrowRightIcon aria-hidden="true" size={18} />
      )}
    </Button>
  );
  return (
    <>
      {presentation === "card" ? (
        <Card className="max-w-xl">
          <CardHeader>
            <HeadsetIcon
              aria-hidden="true"
              className="mb-3 text-muted-foreground"
              size={24}
              weight="regular"
            />
            <CardTitle>Suporte técnico</CardTitle>
            <CardDescription>
              Relate problemas, tire dúvidas ou envie sugestões à equipe de
              suporte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {action}
            {feedback}
          </CardContent>
        </Card>
      ) : (
        <div>
          {action}
          {feedback}
        </div>
      )}
      {open && <SupportForm onClose={() => setOpen(false)} />}
    </>
  );
}

function readAttachment(file: File) {
  return new Promise<{
    name: string;
    mediaType: string;
    size: number;
    base64: string;
  }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        new Error(
          "Não foi possível ler um dos anexos. Selecione o arquivo novamente."
        )
      );
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível ler o anexo."));
        return;
      }
      resolve({
        name: file.name,
        mediaType: file.type || "application/octet-stream",
        size: file.size,
        base64: reader.result.slice(reader.result.indexOf(",") + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}

function SupportForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const lastPayload = useRef<string | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof types)[number][0]>("error");
  const [priority, setPriority] =
    useState<(typeof priorities)[number][0]>("normal");
  const [pageUrl, setPageUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ticketId: string;
    requestedAt: string;
  } | null>(null);
  async function submit() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const cleanUrl = supportPagePath(pageUrl, window.location.origin);
      const attachments = await Promise.all(files.map(readAttachment));
      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        type,
        priority,
        ...(cleanUrl ? { pageUrl: cleanUrl } : {}),
        attachments,
      };
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(payload))
      );
      const fingerprint = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, "0")
      ).join("");
      if (lastPayload.current && lastPayload.current !== fingerprint) {
        requestId.current = crypto.randomUUID();
      }
      lastPayload.current = fingerprint;
      const saved = await rpc.support.submit({
        requestId: requestId.current,
        ...payload,
      });
      setResult(saved);
      requestId.current = crypto.randomUUID();
      setFiles([]);
    } catch (failure) {
      setError(actionErrorMessage(failure));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      description={
        result
          ? "A equipe recebeu sua solicitação. Aguarde o atendimento."
          : "Descreva o que aconteceu e o impacto no seu trabalho."
      }
      footer={
        result ? (
          <Button onClick={onClose}>Concluir</Button>
        ) : (
          <>
            <Button disabled={pending} onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={pending || !subject.trim() || !description.trim()}
              form={id}
              type="submit"
            >
              {pending ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </>
        )
      }
      onClose={onClose}
      pending={pending}
      title={result ? "Solicitação enviada" : "Solicitar suporte técnico"}
    >
      {result ? (
        <div className="space-y-3 text-sm" role="status">
          <p>
            Protocolo: <strong className="break-all">{result.ticketId}</strong>
          </p>
          <p>
            Data da solicitação:{" "}
            {new Date(result.requestedAt).toLocaleString("pt-BR")}
          </p>
          <p className="text-muted-foreground">
            O acompanhamento será feito pela equipe de suporte. O status do
            atendimento não é exibido neste sistema.
          </p>
        </div>
      ) : (
        <form
          className="space-y-5"
          id={id}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset className="space-y-5" disabled={pending}>
            <Field>
              <FieldLabel htmlFor={`${id}-subject`}>Assunto</FieldLabel>
              <Input
                id={`${id}-subject`}
                maxLength={160}
                onChange={(event) => setSubject(event.target.value)}
                required
                value={subject}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-description`}>Descrição</FieldLabel>
              <Textarea
                aria-describedby={`${id}-description-help`}
                id={`${id}-description`}
                maxLength={10_000}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={6}
                value={description}
              />
              <FieldDescription id={`${id}-description-help`}>
                Inclua os passos para reproduzir, o resultado esperado, o que
                ocorreu e a mensagem de erro. Não envie senhas ou dados
                sensíveis.
              </FieldDescription>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-type`}>Tipo</FieldLabel>
                <NativeSelect
                  id={`${id}-type`}
                  onChange={(event) => {
                    const selected = types.find(
                      ([value]) => value === event.target.value
                    );
                    if (selected) {
                      setType(selected[0]);
                    }
                  }}
                  value={type}
                >
                  {types.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-priority`}>Prioridade</FieldLabel>
                <NativeSelect
                  id={`${id}-priority`}
                  onChange={(event) => {
                    const selected = priorities.find(
                      ([value]) => value === event.target.value
                    );
                    if (selected) {
                      setPriority(selected[0]);
                    }
                  }}
                  value={priority}
                >
                  {priorities.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-page`}>
                Página relacionada (opcional)
              </FieldLabel>
              <Input
                aria-describedby={`${id}-page-help`}
                id={`${id}-page`}
                maxLength={2048}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="/tasks ou URL da página"
                type="text"
                value={pageUrl}
              />
              <FieldDescription id={`${id}-page-help`}>
                Parâmetros de consulta e fragmentos serão removidos antes do
                envio.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-files`}>Anexos (opcional)</FieldLabel>
              <Input
                aria-describedby={`${id}-files-help`}
                className="h-auto py-2"
                id={`${id}-files`}
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  const attachmentError = supportAttachmentsError(selected);
                  if (attachmentError) {
                    event.target.value = "";
                    setFiles([]);
                    setError(attachmentError);
                    return;
                  }
                  setError(null);
                  setFiles(selected);
                }}
                type="file"
              />
              <FieldDescription id={`${id}-files-help`}>
                Até 3 arquivos, 2 MB por arquivo e 5 MB no total.{" "}
                {files.length > 0 &&
                  `${files.length} arquivo(s) selecionado(s).`}
              </FieldDescription>
            </Field>
            <p className="text-muted-foreground text-xs">
              Seu nome, email e a data da solicitação serão incluídos para a
              equipe identificar e responder ao pedido.
            </p>
          </fieldset>
          {error && <ErrorNotice message={error} />}
        </form>
      )}
    </Modal>
  );
}
