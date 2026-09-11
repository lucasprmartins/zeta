import { ORPCError, type } from "@orpc/server";
import { HelpError, type HelpService } from "@server/domain/help/help";
import { permissions } from "@server/infrastructure/auth/access";
import { documented } from "../openapi/schema";
import { moduleProcedure, requirePermission } from "./context";
import { object, text } from "./input";

const { procedure, route } = moduleProcedure({
  tag: "Ajuda com IA",
  translate: (error) =>
    error instanceof HelpError && error.code !== "UNAVAILABLE"
      ? { code: error.code, message: error.message }
      : null,
});
const statusOutput = documented(type<{ configured: boolean }>(), {
  type: "object",
  required: ["configured"],
  properties: { configured: { type: "boolean" } },
});

export function createHelpRouter(service?: HelpService) {
  function get() {
    if (!service) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
    return service;
  }
  return {
    status: procedure
      .route({
        ...route,
        method: "GET",
        path: "/help/status",
        summary: "Consultar disponibilidade da ajuda com IA",
      })
      .output(statusOutput)
      .handler(() => get().status()),
    save: procedure
      .use(requirePermission(permissions.access.manage))
      .route({
        ...route,
        method: "PUT",
        path: "/admin/help",
        summary: "Configurar ou remover a chave OpenAI",
      })
      .input(
        documented(
          type<{ apiKey: string | null }>((input) => {
            const data = object(input);
            return {
              apiKey:
                data.apiKey === null
                  ? null
                  : text(data.apiKey, { field: "a chave da API", max: 512 }),
            };
          }),
          {
            type: "object",
            required: ["apiKey"],
            properties: {
              apiKey: {
                anyOf: [
                  { type: "string", minLength: 20, maxLength: 512 },
                  { type: "null" },
                ],
              },
            },
          }
        )
      )
      .output(statusOutput)
      .handler(({ context, input }) =>
        get().save(context.user.id, input.apiKey)
      ),
  };
}
