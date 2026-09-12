import { openapi } from "@elysiajs/openapi";
import { type OpenAPI, OpenAPIGenerator } from "@orpc/openapi";
import type { Authentication } from "@server/interfaces/http/authentication";
import type { AppRouter } from "@server/interfaces/http/rpc/router";
import { organizeAuthSections } from "./auth-sections";
import { schemaConverter } from "./schema";

export async function createDocumentation(
  router: AppRouter,
  authentication: Authentication
) {
  const [tasks, auth] = await Promise.all([
    new OpenAPIGenerator({ schemaConverters: [schemaConverter] }).generate(
      router
    ),
    authentication.getOpenApiSchema?.(),
  ]);
  const paths: OpenAPI.PathsObject = {};
  for (const [path, operation] of Object.entries(tasks.paths ?? {})) {
    paths[`/api${path}`] = operation;
  }
  const authSections = organizeAuthSections(auth);
  Object.assign(paths, authSections.paths);

  return openapi({
    path: "/openapi",
    specPath: "/openapi/json",
    provider: "scalar",
    scalar: {
      theme: "default",
      persistAuth: false,
      // Todas as chamadas são diretas para a mesma origem, sem proxy externo.
      proxyUrl: "",
    },
    exclude: { paths: [/^\/rpc\//, /^\/api\//] },
    documentation: {
      info: {
        title: "Zeta API",
        version: "0.1.0",
        description:
          "Cadastre-se ou entre com email ou nome de usuário e senha nos endpoints de autenticação. O cookie de sessão será usado nas chamadas de tarefas feitas nesta mesma origem. Os endpoints REST usam as mesmas procedures e regras do cliente oRPC.",
      },
      servers: [{ url: "/", description: "Mesma origem da documentação" }],
      tags: [
        { name: "Tarefas" },
        { name: "Suporte técnico" },
        { name: "Sistema" },
        ...authSections.tags,
      ],
      ...{
        "x-tagGroups": [
          { name: "API", tags: ["Tarefas", "Suporte técnico", "Sistema"] },
          { name: "Auth", tags: authSections.tags.map((tag) => tag.name) },
        ],
      },
      paths,
      components: {
        ...auth?.components,
        schemas: { ...auth?.components?.schemas, ...tasks.components?.schemas },
        securitySchemes: {
          ...auth?.components?.securitySchemes,
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
            description:
              "Faça login pelo endpoint sign-in/email. O navegador envia o cookie automaticamente (prefixo __Secure- em HTTPS).",
          },
        },
      },
    },
  });
}
