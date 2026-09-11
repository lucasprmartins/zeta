import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
import { HELP_MODEL, type HelpService } from "@server/domain/help/help";
import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";

export function streamHelp(
  input: Awaited<ReturnType<HelpService["prepare"]>>,
  signal: AbortSignal,
  providerFetch?: OpenAIProviderSettings["fetch"]
) {
  const openai = createOpenAI({
    apiKey: input.apiKey,
    ...(providerFetch ? { fetch: providerFetch } : {}),
  });
  const result = streamText({
    model: openai.responses(HELP_MODEL),
    instructions: input.instructions,
    prompt: input.prompt,
    abortSignal: signal,
    maxOutputTokens: 1600,
    maxRetries: 0,
    providerOptions: { openai: { store: false, reasoningEffort: "low" } },
    onError: () => {
      /* O erro do provedor pode conter prompts e credenciais. */
    },
  });
  return createUIMessageStreamResponse({
    headers: { "Cache-Control": "no-store" },
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: false,
      onError: () =>
        "Não foi possível obter a resposta. Tente novamente ou consulte o Guia de Uso.",
    }),
  });
}
