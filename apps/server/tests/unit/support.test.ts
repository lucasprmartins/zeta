import { expect, test } from "bun:test";
import {
  type SupportInput,
  type SupportSettings,
  type SupportTicket,
  supportService,
  validateSupportInput,
} from "@server/domain/support/support";
import {
  createSupportWebhook,
  isPublicAddress,
  parseWebhookUrl,
  supportTicketId,
} from "@server/infrastructure/support/webhook";

const configuration = {
  webhookUrl: "https://tickets.example.com/hook?key=secret",
  sourceName: "Cliente",
  token: "private-token",
};
const input: SupportInput = {
  requestId: "c108ec90-efbe-427b-a464-198d16484d11",
  subject: "Falha",
  description: "Não salvou",
  type: "error",
  priority: "normal",
  pageUrl: "/tasks",
  attachments: [],
};
const settings: SupportSettings = {
  configured: async () => true,
  get: async () => configuration,
  save: async () => undefined,
  requester: async (id) => ({
    id,
    name: "Pessoa",
    email: "pessoa@example.com",
  }),
};
const runtime = {
  origin: "https://app.example.com",
  now: () => new Date("2026-09-11T15:00:00Z"),
  id: () => crypto.randomUUID(),
};

test("suporte usa identidade confiável e preserva protocolo em nova tentativa", async () => {
  const sent: SupportTicket[] = [];
  let fail = true;
  const service = supportService(
    settings,
    {
      validateUrl: async () => undefined,
      send: async (_, ticket) => {
        sent.push(ticket);
        if (fail) {
          throw new Error("timeout");
        }
      },
    },
    runtime
  );
  await expect(service.submit("account-id", input)).rejects.toThrow();
  fail = false;
  const result = await service.submit("account-id", input);
  expect(sent).toHaveLength(2);
  expect(sent[0]?.ticketId).toBe(result.ticketId);
  expect(sent[1]).toMatchObject({
    schemaVersion: "1.0",
    event: "support.ticket.created",
    requester: { id: "account-id", email: "pessoa@example.com" },
    source: {
      name: "Cliente",
      origin: runtime.origin,
      pageUrl: `${runtime.origin}/tasks`,
    },
    requestedAt: runtime.now().toISOString(),
  });
});

test("suporte recusa contas inativas, configuração ausente, campos inválidos e excesso de envios", async () => {
  let calls = 0;
  const delivery = {
    validateUrl: async () => undefined,
    send: async () => {
      calls++;
    },
  };
  await expect(
    supportService(
      { ...settings, requester: async () => null },
      delivery,
      runtime
    ).submit("id", input)
  ).rejects.toThrow("conta");
  await expect(
    supportService(
      { ...settings, get: async () => null },
      delivery,
      runtime
    ).submit("id", input)
  ).rejects.toThrow("configurado");
  const service = supportService(settings, delivery, runtime);
  for (const pageUrl of [
    "//evil.com",
    "/tasks?token=secret",
    "/tasks#secret",
    "https://evil.com",
  ]) {
    await expect(service.submit("id", { ...input, pageUrl })).rejects.toThrow(
      "caminho"
    );
  }
  expect(calls).toBe(0);
  for (let i = 0; i < 5; i++) {
    await service.submit("id", input);
  }
  await expect(service.submit("id", input)).rejects.toThrow("Limite");
  expect(calls).toBe(5);
});

test("anexos validam conteúdo real, base64, tamanho individual, total e nome", () => {
  const file = {
    name: "captura.png",
    mediaType: "image/png",
    size: 2 * 1024 * 1024,
    base64: Buffer.alloc(2 * 1024 * 1024).toString("base64"),
  };
  expect(() =>
    validateSupportInput({ ...input, attachments: [file] })
  ).not.toThrow();
  for (const broken of [
    { ...file, size: 1 },
    { ...file, base64: "!!!!" },
    { ...file, name: "../secret" },
    { ...file, size: 0, base64: "" },
  ]) {
    expect(() =>
      validateSupportInput({ ...input, attachments: [broken] })
    ).toThrow();
  }
  expect(() =>
    validateSupportInput({ ...input, attachments: [file, file, file] })
  ).toThrow("total");
  expect(() => validateSupportInput({ ...input, subject: " " })).toThrow();
});

test("webhook aceita somente HTTPS público e bloqueia endereços internos e reservados", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "172.16.0.1",
    "192.168.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "2001:db8::1",
  ]) {
    expect(isPublicAddress(address)).toBe(false);
  }
  for (const url of [
    "http://example.com",
    "https://127.1",
    "https://user:pass@example.com",
    "https://example.com:8443",
    "https://example.com/#fragment",
  ]) {
    expect(() => parseWebhookUrl(url)).toThrow();
  }
  expect(isPublicAddress("8.8.8.8")).toBe(true);
  expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
});

test("webhook confirma apenas 200 e envia contrato, autenticação e IP fixado", async () => {
  let status = 200;
  const webhook = createSupportWebhook({
    resolve: async () => [{ address: "8.8.8.8", family: 4 }],
    post: async (options, body) => {
      expect(options.hostname).toBe("8.8.8.8");
      expect(options.servername).toBe("tickets.example.com");
      expect(options.agent).toBe(false);
      expect(options.headers).toMatchObject({
        Authorization: "Bearer private-token",
        Host: "tickets.example.com",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(body)).toMatchObject({
        schemaVersion: "1.0",
        requester: { id: "id" },
      });
      return status;
    },
  });
  const service = supportService(settings, webhook, runtime);
  await expect(service.submit("id", input)).resolves.toHaveProperty("ticketId");
  for (status of [201, 202, 302, 500]) {
    await expect(service.submit("id", input)).rejects.toThrow("HTTP 200");
  }
});

test("webhook bloqueia DNS privado e timeout sem expor segredos", async () => {
  let calls = 0;
  const post = async () => {
    calls++;
    return 200;
  };
  for (const resolve of [
    async () => [{ address: "10.0.0.1", family: 4 }],
    async () => {
      throw new Error(configuration.webhookUrl);
    },
  ]) {
    const service = supportService(
      settings,
      createSupportWebhook({ resolve, post }),
      runtime
    );
    await expect(service.submit("id", input)).rejects.toThrow(
      "Não foi possível confirmar"
    );
  }
  const service = supportService(
    settings,
    createSupportWebhook({
      timeoutMs: 5,
      resolve: () => new Promise(() => undefined),
      post,
    }),
    runtime
  );
  await expect(service.submit("id", input)).rejects.toThrow(
    "Não foi possível confirmar"
  );
  expect(calls).toBe(0);
});

test("protocolo permanece estável entre processos e separa solicitantes e origens", () => {
  const id = supportTicketId(runtime.origin, "actor", input.requestId);
  expect(supportTicketId(runtime.origin, "actor", input.requestId)).toBe(id);
  expect(supportTicketId(runtime.origin, "other", input.requestId)).not.toBe(
    id
  );
  expect(
    supportTicketId("https://other.example.com", "actor", input.requestId)
  ).not.toBe(id);
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
  );
});
