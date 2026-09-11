import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { RPCHandler, type RPCHandlerOptions } from "@orpc/server/fetch";
import { Elysia, t } from "elysia";
import type { Authentication } from "./authentication";
import { createDocumentation } from "./openapi/documentation";
import type { RpcContext } from "./rpc/context";
import type { AppRouter } from "./rpc/router";

export async function createApp(dependencies: {
  router: AppRouter;
  authentication: Authentication;
  checkDatabase: () => Promise<void>;
  reportError?: (error: unknown) => void;
  helpChat?: (request: Request) => Promise<Response>;
}) {
  const reportError =
    dependencies.reportError ?? ((error: unknown) => console.error(error));
  const handlerOptions: RPCHandlerOptions<RpcContext> = {
    interceptors: [
      onError((error) => {
        if (
          !(
            error instanceof Error &&
            "status" in error &&
            typeof error.status === "number" &&
            error.status < 500
          )
        ) {
          reportError(error);
        }
      }),
    ],
  };
  const rpc = new RPCHandler(dependencies.router, handlerOptions);
  const rest = new OpenAPIHandler(dependencies.router, handlerOptions);
  const documentation = await createDocumentation(
    dependencies.router,
    dependencies.authentication
  );

  return new Elysia()
    .use(documentation)
    .onError(({ code, error, set }) => {
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { message: "Rota não encontrada." };
      }
      reportError(error);
      set.status = 500;
      return { message: "Erro interno do servidor." };
    })
    .get("/health", () => ({ status: "ok" as const }), {
      detail: { tags: ["Sistema"], summary: "Saúde do processo" },
      response: t.Object({ status: t.Literal("ok") }),
    })
    .get(
      "/ready",
      async ({ set }) => {
        try {
          await dependencies.checkDatabase();
          return { status: "ok" };
        } catch (error) {
          reportError(error);
          set.status = 503;
          return { status: "unavailable" };
        }
      },
      {
        detail: { tags: ["Sistema"], summary: "Disponibilidade do banco" },
        response: {
          200: t.Object({ status: t.Literal("ok") }),
          503: t.Object({ status: t.Literal("unavailable") }),
        },
      }
    )
    .post(
      "/api/help/chat",
      ({ request }) =>
        dependencies.helpChat?.(request) ??
        new Response("Ajuda indisponível.", { status: 503 }),
      { parse: "none", detail: { hide: true } }
    )
    .all(
      "/api/auth/*",
      ({ request }) => dependencies.authentication.handle(request),
      { parse: "none" }
    )
    .all(
      "/api/*",
      async ({ request }) => {
        const { response } = await rest.handle(request, {
          prefix: "/api",
          context: {
            headers: request.headers,
            authentication: dependencies.authentication,
          },
        });
        return response ?? new Response("Not found", { status: 404 });
      },
      { parse: "none" }
    )
    .all(
      "/rpc/*",
      async ({ request }) => {
        const { response } = await rpc.handle(request, {
          prefix: "/rpc",
          context: {
            headers: request.headers,
            authentication: dependencies.authentication,
          },
        });
        return response ?? new Response("Not found", { status: 404 });
      },
      { parse: "none" }
    );
}
