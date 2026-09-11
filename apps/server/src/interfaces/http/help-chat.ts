import {
  HelpError,
  type HelpService,
  MAX_QUESTION_LENGTH,
} from "@server/domain/help/help";
import type { Authentication } from "./authentication";

export interface HelpChatDependencies {
  authentication: Authentication;
  service: HelpService;
  stream: (
    input: Awaited<ReturnType<HelpService["prepare"]>>,
    signal: AbortSignal
  ) => Response;
  trustedOrigins: readonly string[];
}

function failure(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof HelpError) {
    return failure(
      error.message,
      { BAD_REQUEST: 400, FORBIDDEN: 403, UNAVAILABLE: 503 }[error.code]
    );
  }
  // Erros do provedor/banco podem conter credenciais e prompts: não os exponha.
  return failure(
    "Não foi possível consultar a ajuda agora. Tente novamente ou abra o Guia de Uso.",
    503
  );
}

async function readQuestion(request: Request): Promise<string | Response> {
  // Limita o corpo antes do parse, inclusive sem Content-Length.
  const reader = request.body?.getReader();
  if (!reader) {
    return failure("Escreva uma pergunta.", 400);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    size += chunk.value.byteLength;
    if (size > MAX_QUESTION_LENGTH * 6 + 100) {
      await reader.cancel();
      return failure("A pergunta excede o limite permitido.", 413);
    }
    chunks.push(chunk.value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return failure("Pergunta inválida.", 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("question" in body) ||
    typeof body.question !== "string" ||
    Object.keys(body).some((key) => key !== "question")
  ) {
    return failure("Envie apenas o texto da pergunta.", 400);
  }
  return body.question;
}

export function createHelpChat(dependencies: HelpChatDependencies) {
  const requests = new Map<string, number[]>();
  function allow(userId: string) {
    const now = Date.now();
    for (const [id, times] of requests) {
      if (!times.some((time) => now - time < 60_000)) {
        requests.delete(id);
      }
    }
    const recent = (requests.get(userId) ?? []).filter(
      (time) => now - time < 60_000
    );
    if (
      recent.length >= 5 ||
      (requests.size >= 10_000 && !requests.has(userId))
    ) {
      return false;
    }
    requests.set(userId, [...recent, now]);
    return true;
  }
  return async (request: Request) => {
    try {
      const origin = request.headers.get("origin");
      if (
        (origin && !dependencies.trustedOrigins.includes(origin)) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      ) {
        return failure("Origem não permitida.", 403);
      }
      const user = await dependencies.authentication.resolveUser(
        request.headers
      );
      if (!user) {
        return failure("Sua sessão expirou. Entre novamente.", 401);
      }
      if (
        !request.headers.get("content-type")?.startsWith("application/json")
      ) {
        return failure("Envie uma pergunta em JSON.", 415);
      }
      const question = await readQuestion(request);
      if (question instanceof Response) {
        return question;
      }
      if (!allow(user.id)) {
        return failure(
          "Aguarde um minuto antes de enviar outra pergunta.",
          429
        );
      }
      const input = await dependencies.service.prepare(question, user.grants);
      return dependencies.stream(
        input,
        AbortSignal.any([request.signal, AbortSignal.timeout(60_000)])
      );
    } catch (error) {
      return errorResponse(error);
    }
  };
}
