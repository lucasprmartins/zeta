import { expect, test } from "bun:test";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import {
  SupportError,
  type SupportTicket,
  supportService,
} from "@server/domain/support/support";
import type { RpcContext } from "@server/interfaces/http/rpc/context";
import { createSupportRouter } from "@server/interfaces/http/rpc/support";

function fixture() {
  const sent: SupportTicket[] = [];
  let fail = false;
  const service = supportService(
    {
      configured: async () => true,
      get: async () => ({
        webhookUrl: "https://example.com/tickets",
        sourceName: "Cliente",
        token: null,
      }),
      save: async () => undefined,
      requester: async (id) => ({
        id,
        name: "Conta real",
        email: "real@example.com",
      }),
    },
    {
      validateUrl: async () => undefined,
      send: async (_, ticket) => {
        if (fail) {
          throw new SupportError("UNAVAILABLE", "Entrega não confirmada.");
        }
        sent.push(ticket);
      },
    },
    {
      origin: "https://app.example.com",
      now: () => new Date("2026-09-11T15:00:00Z"),
      id: () => crypto.randomUUID(),
    }
  );
  const handler = new OpenAPIHandler({ support: createSupportRouter(service) });
  async function request(
    path: string,
    body?: unknown,
    identity = "user",
    method = body === undefined ? "GET" : "POST"
  ) {
    const headers = new Headers({ "content-type": "application/json" });
    const context: RpcContext = {
      headers,
      authentication: {
        handle: async () => new Response(),
        resolveUser: async () =>
          identity
            ? {
                id: identity,
                role: "user",
                grants: identity === "admin" ? ["access:manage"] : [],
              }
            : null,
      },
    };
    const result = await handler.handle(
      new Request(`https://app.example.com${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { context }
    );
    if (!result.response) {
      throw new Error("Missing response");
    }
    return result.response;
  }
  return {
    request,
    sent,
    fail: () => {
      fail = true;
    },
  };
}
const ticket = {
  requestId: "c108ec90-efbe-427b-a464-198d16484d11",
  subject: "Erro",
  description: "Não consigo salvar",
  type: "error",
  priority: "high",
  attachments: [],
};
test("suporte HTTP exige sessão e restringe configuração por permissão", async () => {
  const { request } = fixture();
  expect((await request("/support/status", undefined, "")).status).toBe(401);
  expect((await request("/support/tickets", ticket, "")).status).toBe(401);
  expect(
    (await request("/admin/support", { webhookUrl: null }, "user", "PUT"))
      .status
  ).toBe(403);
  expect(
    (await request("/admin/support", { webhookUrl: null }, "admin", "PUT"))
      .status
  ).toBe(200);
  expect(await (await request("/support/status")).json()).toEqual({
    configured: true,
  });
});
test("suporte HTTP valida entrada e ignora identidade e datas declaradas pelo cliente", async () => {
  const { request, sent } = fixture();
  expect(
    (await request("/support/tickets", { ...ticket, type: "invalid" })).status
  ).toBe(400);
  expect(
    (
      await request("/support/tickets", {
        ...ticket,
        attachments: [{ size: "4" }],
      })
    ).status
  ).toBe(400);
  const response = await request("/support/tickets", {
    ...ticket,
    requester: { id: "other" },
    requestedAt: "1900-01-01",
  });
  expect(response.status).toBe(200);
  expect(sent[0]?.requester).toEqual({
    id: "user",
    name: "Conta real",
    email: "real@example.com",
  });
  expect(await response.json()).toMatchObject({
    requestedAt: "2026-09-11T15:00:00.000Z",
  });
});
test("suporte HTTP traduz falha da entrega e limite sem confirmar sucesso", async () => {
  const fixtureValue = fixture();
  fixtureValue.fail();
  for (let i = 0; i < 5; i++) {
    expect(
      (await fixtureValue.request("/support/tickets", ticket)).status
    ).toBe(503);
  }
  expect((await fixtureValue.request("/support/tickets", ticket)).status).toBe(
    429
  );
  expect(fixtureValue.sent).toHaveLength(0);
});
