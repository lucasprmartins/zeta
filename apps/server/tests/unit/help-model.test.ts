import { expect, test } from "bun:test";
import { streamHelp } from "@server/infrastructure/ai/help-model";

function mockFetch(
  handler: (...args: Parameters<typeof fetch>) => Promise<Response>
): typeof fetch {
  return Object.assign(handler, {
    preconnect: () => {
      /* Sem rede nos testes. */
    },
  });
}

const input = {
  apiKey: "sk-private-test-key",
  instructions: "Responda somente pelo guia.",
  prompt: "Como uso?",
};

test("AI SDK fixa modelo, desativa armazenamento e não envia ferramentas ou histórico", async () => {
  let body: Record<string, unknown> = {};
  const response = streamHelp(
    input,
    new AbortController().signal,
    mockFetch((_url, init) => {
      body = JSON.parse(String(init?.body));
      const events = [
        {
          type: "response.created",
          response: { id: "resp_test", created_at: 1, model: "gpt-5.6-luna" },
        },
        {
          type: "response.output_item.added",
          output_index: 0,
          item: {
            id: "msg_test",
            type: "message",
            role: "assistant",
            content: [],
          },
        },
        {
          type: "response.output_text.delta",
          item_id: "msg_test",
          output_index: 0,
          content_index: 0,
          delta: "Use o menu.",
        },
        {
          type: "response.output_item.done",
          output_index: 0,
          item: {
            id: "msg_test",
            type: "message",
            role: "assistant",
            content: [
              { type: "output_text", text: "Use o menu.", annotations: [] },
            ],
          },
        },
        {
          type: "response.completed",
          response: {
            id: "resp_test",
            created_at: 1,
            model: "gpt-5.6-luna",
            status: "completed",
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              total_tokens: 15,
              output_tokens_details: { reasoning_tokens: 0 },
            },
          },
        },
      ];
      return Promise.resolve(
        new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
          { headers: { "content-type": "text/event-stream" } }
        )
      );
    })
  );
  const stream = await response.text();
  expect(stream).toContain("Use o menu.");
  expect(stream).toContain('"type":"finish"');
  expect(body.model).toBe("gpt-5.6-luna");
  expect(body.store).toBe(false);
  expect(body.tools).toBeUndefined();
  expect(body.previous_response_id).toBeUndefined();
  expect(body.max_output_tokens).toBe(1600);
  expect(JSON.stringify(body)).not.toContain(input.apiKey);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("falhas da OpenAI não vazam chave ou detalhes de resposta no stream", async () => {
  const response = streamHelp(
    input,
    new AbortController().signal,
    mockFetch(() =>
      Promise.resolve(
        Response.json(
          {
            error: {
              message: `Invalid key ${input.apiKey}`,
              type: "invalid_request_error",
            },
          },
          { status: 401 }
        )
      )
    )
  );
  const stream = await response.text();
  expect(stream).toContain("Não foi possível obter a resposta");
  expect(stream).not.toContain(input.apiKey);
  expect(stream).not.toContain("invalid_request_error");
});
