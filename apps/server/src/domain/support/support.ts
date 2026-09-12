export const SUPPORT_TYPES = [
  "error",
  "feature",
  "optimization",
  "question",
  "suggestion",
] as const;
export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export interface SupportAttachment {
  base64: string;
  mediaType: string;
  name: string;
  size: number;
}
export interface SupportInput {
  attachments: SupportAttachment[];
  description: string;
  pageUrl?: string;
  priority: (typeof SUPPORT_PRIORITIES)[number];
  requestId: string;
  subject: string;
  type: (typeof SUPPORT_TYPES)[number];
}
export interface SupportConfiguration {
  sourceName: string;
  token: string | null;
  webhookUrl: string;
}
export interface SupportConfigurationInput {
  sourceName?: string;
  token?: string | null;
  webhookUrl: string | null;
}
export interface SupportRequester {
  email: string;
  id: string;
  name: string;
}
export interface SupportSettings {
  configured(): Promise<boolean>;
  get(): Promise<SupportConfiguration | null>;
  requester(actorId: string): Promise<SupportRequester | null>;
  save(actorId: string, input: SupportConfigurationInput): Promise<void>;
}
export interface SupportTicket extends Omit<SupportInput, "pageUrl"> {
  event: "support.ticket.created";
  requestedAt: string;
  requester: SupportRequester;
  schemaVersion: "1.0";
  source: { name: string; origin: string; pageUrl?: string };
  ticketId: string;
}
export interface SupportDelivery {
  send(
    configuration: SupportConfiguration,
    ticket: SupportTicket
  ): Promise<void>;
  validateUrl(value: string): Promise<void>;
}
export class SupportError extends Error {
  constructor(
    public readonly code:
      | "BAD_REQUEST"
      | "FORBIDDEN"
      | "CONFLICT"
      | "UNAVAILABLE"
      | "RATE_LIMITED",
    message: string
  ) {
    super(message);
    this.name = "SupportError";
  }
}
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const MEDIA_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function bad(message: string): never {
  throw new SupportError("BAD_REQUEST", message);
}
export function validateSupportInput(input: SupportInput): void {
  if (
    !(UUID.test(input.requestId) && input.subject.trim()) ||
    input.subject.length > 160 ||
    !input.description.trim() ||
    input.description.length > 10_000 ||
    !SUPPORT_TYPES.includes(input.type) ||
    !SUPPORT_PRIORITIES.includes(input.priority)
  ) {
    bad("Revise os campos da solicitação.");
  }
  if (input.attachments.length > 3) {
    bad("Envie no máximo 3 anexos.");
  }
  let total = 0;
  for (const file of input.attachments) {
    if (
      !file.name.trim() ||
      file.name.length > 180 ||
      Array.from(file.name).some((character) => character.charCodeAt(0) < 32) ||
      /[/\\]/.test(file.name) ||
      !MEDIA_TYPE.test(file.mediaType) ||
      file.mediaType.length > 120 ||
      !Number.isSafeInteger(file.size) ||
      file.size < 1 ||
      file.size > MAX_ATTACHMENT_BYTES ||
      file.base64.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4 ||
      file.base64.length % 4 !== 0 ||
      !BASE64.test(file.base64)
    ) {
      bad("Anexo inválido. Use arquivos de até 2 MB com nome e tipo válidos.");
    }
    const padding = file.base64.endsWith("==")
      ? 2
      : file.base64.endsWith("=")
        ? 1
        : 0;
    const actualSize = (file.base64.length / 4) * 3 - padding;
    if (actualSize !== file.size) {
      bad("O conteúdo do anexo não corresponde ao tamanho informado.");
    }
    total += actualSize;
  }
  if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
    bad("O total de anexos deve ser de até 5 MB.");
  }
}

export function supportService(
  settings: SupportSettings,
  delivery: SupportDelivery,
  runtime: {
    origin: string;
    now(): Date;
    id(actorId: string, requestId: string): string;
  }
) {
  const receipts = new Map<
    string,
    { ticketId: string; requestedAt: string; expires: number }
  >();
  const attempts = new Map<string, { started: number; count: number }>();
  function reserve(actorId: string) {
    const now = runtime.now().getTime();
    for (const [key, entry] of attempts) {
      if (now - entry.started >= 600_000) {
        attempts.delete(key);
      }
    }
    const entry = attempts.get(actorId);
    if ((entry && entry.count >= 5) || (!entry && attempts.size >= 10_000)) {
      throw new SupportError(
        "RATE_LIMITED",
        "Limite de solicitações atingido. Aguarde 10 minutos antes de tentar novamente."
      );
    }
    attempts.set(actorId, {
      started: entry?.started ?? now,
      count: (entry?.count ?? 0) + 1,
    });
  }
  return {
    status: async () => ({ configured: await settings.configured() }),
    async save(actorId: string, input: SupportConfigurationInput) {
      if (input.webhookUrl !== null) {
        if (input.webhookUrl.length > 2048) {
          bad("Informe uma URL de webhook válida.");
        }
        await delivery.validateUrl(input.webhookUrl);
      }
      if (
        input.token &&
        (input.token.length > 1024 || /[^\x21-\x7e]/.test(input.token))
      ) {
        bad("Informe um token sem espaços de até 1024 caracteres.");
      }
      if (input.sourceName && input.sourceName.length > 120) {
        bad("Identifique o sistema em até 120 caracteres.");
      }
      await settings.save(actorId, input);
      return { configured: input.webhookUrl !== null };
    },
    async submit(actorId: string, input: SupportInput) {
      validateSupportInput(input);
      const requester = await settings.requester(actorId);
      if (!requester) {
        throw new SupportError(
          "FORBIDDEN",
          "Sua conta não pode enviar solicitações."
        );
      }
      const configuration = await settings.get();
      if (!configuration) {
        throw new SupportError(
          "UNAVAILABLE",
          "O suporte técnico ainda não foi configurado."
        );
      }
      let pageUrl: string | undefined;
      if (input.pageUrl) {
        if (
          !input.pageUrl.startsWith("/") ||
          input.pageUrl.startsWith("//") ||
          /[?#\\\s]/.test(input.pageUrl) ||
          input.pageUrl.length > 2048
        ) {
          bad("Informe apenas o caminho da página deste sistema.");
        }
        pageUrl = `${runtime.origin}${input.pageUrl}`;
      }
      reserve(actorId);
      const receiptKey = `${actorId}:${input.requestId}`;
      const now = runtime.now().getTime();
      for (const [key, receipt] of receipts) {
        if (receipt.expires <= now) {
          receipts.delete(key);
        }
      }
      let receipt = receipts.get(receiptKey);
      if (!receipt) {
        if (receipts.size >= 10_000) {
          throw new SupportError(
            "RATE_LIMITED",
            "O suporte está ocupado. Tente novamente mais tarde."
          );
        }
        receipt = {
          ticketId: runtime.id(actorId, input.requestId),
          requestedAt: runtime.now().toISOString(),
          expires: now + 86_400_000,
        };
        receipts.set(receiptKey, receipt);
      }
      const ticket: SupportTicket = {
        schemaVersion: "1.0",
        event: "support.ticket.created",
        ticketId: receipt.ticketId,
        requestId: input.requestId,
        requestedAt: receipt.requestedAt,
        subject: input.subject.trim(),
        description: input.description.trim(),
        type: input.type,
        priority: input.priority,
        attachments: input.attachments,
        requester,
        source: {
          name: configuration.sourceName,
          origin: runtime.origin,
          ...(pageUrl ? { pageUrl } : {}),
        },
      };
      await delivery.send(configuration, ticket);
      return { ticketId: ticket.ticketId, requestedAt: ticket.requestedAt };
    },
  };
}
export type SupportService = ReturnType<typeof supportService>;
