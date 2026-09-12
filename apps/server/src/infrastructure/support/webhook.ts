import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import type { RequestOptions } from "node:https";
import { request } from "node:https";
import { isIP } from "node:net";
import {
  type SupportDelivery,
  SupportError,
} from "@server/domain/support/support";

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    const a = octets[0] ?? 0;
    const b = octets[1] ?? 0;
    const c = octets[2] ?? 0;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    // Only global unicast, excluding transition and documentation networks.
    const normalized = new URL(`http://[${address}]`).hostname.slice(1, -1);
    const [first = "", second = ""] = normalized.split(":");
    const prefix = Number.parseInt(first, 16);
    const subnet = Number.parseInt(second || "0", 16);
    return (
      prefix >= 0x20_00 &&
      prefix <= 0x3f_ff &&
      prefix !== 0x20_02 &&
      !(prefix === 0x20_01 && (subnet < 0x2_00 || subnet === 0xd_b8)) &&
      !(prefix === 0x3f_ff && subnet < 0x10_00)
    );
  }
  return false;
}
export function parseWebhookUrl(value: string): URL {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      (url.port && url.port !== "443") ||
      !(url.hostname.includes(".") || url.hostname.includes(":"))
    ) {
      throw new Error("Invalid webhook URL");
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(hostname) && !isPublicAddress(hostname)) {
      throw new Error("Invalid webhook URL");
    }
    return url;
  } catch {
    // biome-ignore lint/style/useErrorCause: A URL pode conter credenciais; não registrar a causa.
    throw new SupportError(
      "BAD_REQUEST",
      "Use uma URL HTTPS pública, na porta 443, sem usuário, senha ou fragmento."
    );
  }
}
async function resolvePublic(
  url: URL,
  resolve: (hostname: string) => Promise<{ address: string; family: number }[]>
) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolve(hostname);
  const [target] = addresses;
  if (!target || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new SupportError(
      "BAD_REQUEST",
      "O webhook deve apontar exclusivamente para endereços públicos."
    );
  }
  return target;
}
const DELIVERY_MESSAGE =
  "Não foi possível confirmar o envio ao suporte. Tente novamente; a confirmação exige HTTP 200 do webhook.";
export function createSupportWebhook(
  options: {
    resolve?: (
      hostname: string
    ) => Promise<{ address: string; family: number }[]>;
    post?: (options: RequestOptions, body: string) => Promise<number>;
    timeoutMs?: number;
  } = {}
): SupportDelivery {
  const resolve =
    options.resolve ?? ((hostname) => lookup(hostname, { all: true }));
  const post = options.post ?? postSupportTicket;
  return {
    async validateUrl(value) {
      parseWebhookUrl(value);
    },
    async send(configuration, ticket) {
      const signal = AbortSignal.timeout(options.timeoutMs ?? 15_000);
      try {
        const url = parseWebhookUrl(configuration.webhookUrl);
        const target = await Promise.race([
          resolvePublic(url, resolve),
          new Promise<never>((_, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("Timeout")),
              { once: true }
            );
          }),
        ]);
        signal.throwIfAborted();
        const body = JSON.stringify(ticket);
        const idempotencyKey = createHash("sha256")
          .update(
            JSON.stringify([
              ticket.source.origin,
              ticket.requester.id,
              ticket.requestId,
            ])
          )
          .digest("hex");
        const status = await post(
          {
            protocol: "https:",
            hostname: target.address,
            family: target.family,
            servername: url.hostname.replace(/^\[|\]$/g, ""),
            port: 443,
            path: `${url.pathname}${url.search}`,
            method: "POST",
            agent: false,
            signal,
            headers: {
              Host: url.host,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
              "Idempotency-Key": idempotencyKey,
              "X-Support-Schema-Version": "1.0",
              ...(configuration.token
                ? { Authorization: `Bearer ${configuration.token}` }
                : {}),
            },
          },
          body
        );
        if (status !== 200) {
          throw new Error("Webhook rejected");
        }
      } catch {
        // biome-ignore lint/style/useErrorCause: Falhas do transporte podem incluir URL e token secretos.
        throw new SupportError("UNAVAILABLE", DELIVERY_MESSAGE);
      }
    },
  };
}

function postSupportTicket(
  options: RequestOptions,
  body: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    // O IP já foi validado; servername mantém a validação TLS do host original.
    const req = request(options, (response) => {
      const status = response.statusCode ?? 0;
      response.destroy();
      resolve(status);
    });
    req.on("error", reject);
    req.end(body);
  });
}

// Protocolo determinístico mantém a referência após reinício ou troca de réplica.
export function supportTicketId(
  origin: string,
  actorId: string,
  requestId: string
): string {
  const hash = createHash("sha256")
    .update(JSON.stringify([origin, actorId, requestId]))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
