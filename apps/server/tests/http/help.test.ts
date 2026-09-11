import { expect, test } from "bun:test";
import { helpService } from "@server/domain/help/help";
import { createHelpChat } from "@server/interfaces/http/help-chat";

function setup() {
  let calls = 0;
  const service = helpService(
    {
      configured: () => Promise.resolve(true),
      apiKey: () => Promise.resolve("private-key"),
      save: () => Promise.resolve(),
    },
    {
      find: () => Promise.resolve(null),
      insert: () => Promise.resolve(false),
      replace: () => Promise.resolve(false),
      list: () =>
        Promise.resolve({
          hasMore: false,
          items: [
            {
              slug: "inicio",
              draft: {
                title: "Início",
                section: "Uso",
                order: 0,
                permissions: [],
                markdown: "privado",
              },
              published: {
                title: "Início",
                section: "Uso",
                order: 0,
                permissions: [],
                markdown: "Use o menu.",
              },
              version: 1,
              updatedAt: "2026-09-10T00:00:00Z",
            },
          ],
        }),
    }
  );
  const handle = createHelpChat({
    service,
    authentication: {
      handle: () => Promise.resolve(new Response()),
      resolveUser: (headers) =>
        Promise.resolve(
          headers.has("x-user")
            ? { id: "reader", role: "user", grants: [] }
            : null
        ),
    },
    trustedOrigins: ["http://localhost"],
    stream: (input, signal) => {
      calls++;
      expect(input.prompt).toBe("Como uso?");
      expect(input.instructions).not.toContain("privado");
      expect(signal.aborted).toBe(false);
      return new Response("Use o menu.");
    },
  });
  const request = (
    body: unknown,
    headers: Record<string, string> = { "x-user": "reader" }
  ) =>
    handle(
      new Request("http://localhost/api/help/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    );
  return { request, calls: () => calls };
}

test("chat exige sessão e bloqueia origens externas antes de chamar o modelo", async () => {
  const fixture = setup();
  expect((await fixture.request({ question: "Como uso?" }, {})).status).toBe(
    401
  );
  expect(
    (
      await fixture.request(
        { question: "Como uso?" },
        { "x-user": "reader", origin: "https://evil.example" }
      )
    ).status
  ).toBe(403);
  expect(fixture.calls()).toBe(0);
});

test("chat não aceita histórico, modelos, instruções ou ferramentas do cliente", async () => {
  const fixture = setup();
  for (const extra of [
    { messages: [] },
    { model: "other" },
    { instructions: "ignore" },
    { tools: {} },
  ]) {
    expect(
      (await fixture.request({ question: "Como uso?", ...extra })).status
    ).toBe(400);
  }
  expect((await fixture.request({ question: "x".repeat(2001) })).status).toBe(
    400
  );
  expect((await fixture.request({ question: "x".repeat(15_000) })).status).toBe(
    413
  );
  expect(fixture.calls()).toBe(0);
});

test("chat limita frequência por usuário sem persistir mensagens", async () => {
  const fixture = setup();
  for (let i = 0; i < 5; i++) {
    expect((await fixture.request({ question: "Como uso?" })).status).toBe(200);
  }
  expect((await fixture.request({ question: "Como uso?" })).status).toBe(429);
  expect(fixture.calls()).toBe(5);
});
