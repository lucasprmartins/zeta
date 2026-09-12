import { ORPCError, type } from "@orpc/server";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_TYPES,
  type SupportConfigurationInput,
  SupportError,
  type SupportInput,
  type SupportService,
} from "@server/domain/support/support";
import { permissions } from "@server/infrastructure/auth/access";
import { documented } from "../openapi/schema";
import { moduleProcedure, requirePermission } from "./context";
import { object, text } from "./input";

const { procedure, route } = moduleProcedure({
  tag: "Suporte técnico",
  translate: (error) =>
    error instanceof SupportError &&
    error.code !== "UNAVAILABLE" &&
    error.code !== "RATE_LIMITED"
      ? { code: error.code, message: error.message }
      : null,
});
const base = procedure.use(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (
      error instanceof SupportError &&
      (error.code === "UNAVAILABLE" || error.code === "RATE_LIMITED")
    ) {
      throw new ORPCError(
        error.code === "UNAVAILABLE"
          ? "SERVICE_UNAVAILABLE"
          : "TOO_MANY_REQUESTS",
        { message: error.message, cause: error }
      );
    }
    throw error;
  }
});
const statusOutput = documented(type<{ configured: boolean }>(), {
  type: "object",
  required: ["configured"],
  properties: { configured: { type: "boolean" } },
});
const stringSchema = (maxLength: number) => ({
  type: "string" as const,
  minLength: 1,
  maxLength,
});
function select<T extends string>(value: unknown, values: readonly T[]): T {
  const selected = values.find((entry) => entry === value);
  if (!selected) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Selecione uma opção válida.",
    });
  }
  return selected;
}
export function createSupportRouter(service?: SupportService) {
  function get() {
    if (!service) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
    return service;
  }
  return {
    status: base
      .route({
        ...route,
        method: "GET",
        path: "/support/status",
        summary: "Consultar disponibilidade do suporte",
      })
      .output(statusOutput)
      .handler(() => get().status()),
    save: base
      .use(requirePermission(permissions.access.manage))
      .route({
        ...route,
        method: "PUT",
        path: "/admin/support",
        summary: "Configurar webhook de suporte",
      })
      .input(
        documented(
          type<SupportConfigurationInput>((input) => {
            const data = object(input);
            return {
              webhookUrl:
                data.webhookUrl === null
                  ? null
                  : text(data.webhookUrl, { field: "a URL", max: 2048 }),
              ...(data.token === undefined
                ? {}
                : {
                    token:
                      data.token === null
                        ? null
                        : text(data.token, { field: "o token", max: 1024 }),
                  }),
              ...(data.sourceName === undefined
                ? {}
                : {
                    sourceName: text(data.sourceName, {
                      field: "o nome do sistema",
                      max: 120,
                    }),
                  }),
            };
          }),
          {
            type: "object",
            required: ["webhookUrl"],
            properties: {
              webhookUrl: { anyOf: [stringSchema(2048), { type: "null" }] },
              token: { anyOf: [stringSchema(1024), { type: "null" }] },
              sourceName: stringSchema(120),
            },
          }
        )
      )
      .output(statusOutput)
      .handler(({ context, input }) => get().save(context.user.id, input)),
    submit: base
      .route({
        ...route,
        method: "POST",
        path: "/support/tickets",
        summary: "Enviar solicitação ao suporte",
      })
      .input(
        documented(
          type<SupportInput>((input) => {
            const data = object(input);
            if (
              !Array.isArray(data.attachments) ||
              data.attachments.length > 3
            ) {
              throw new ORPCError("BAD_REQUEST", {
                message: "Envie até três anexos.",
              });
            }
            return {
              requestId: text(data.requestId, {
                field: "o identificador",
                max: 36,
              }),
              subject: text(data.subject, { field: "o assunto", max: 160 }),
              description: text(data.description, {
                field: "a descrição",
                max: 10_000,
              }),
              type: select(data.type, SUPPORT_TYPES),
              priority: select(data.priority, SUPPORT_PRIORITIES),
              ...(data.pageUrl === undefined
                ? {}
                : {
                    pageUrl: text(data.pageUrl, {
                      field: "o caminho da página",
                      max: 2048,
                    }),
                  }),
              attachments: data.attachments.map((value) => {
                const file = object(value);
                if (typeof file.size !== "number") {
                  throw new ORPCError("BAD_REQUEST", {
                    message: "Tamanho de anexo inválido.",
                  });
                }
                return {
                  name: text(file.name, { field: "o nome do anexo", max: 180 }),
                  mediaType: text(file.mediaType, {
                    field: "o tipo do anexo",
                    max: 120,
                  }),
                  size: file.size,
                  base64: text(file.base64, {
                    field: "o conteúdo do anexo",
                    max: 2_796_204,
                  }),
                };
              }),
            };
          }),
          {
            type: "object",
            required: [
              "requestId",
              "subject",
              "description",
              "type",
              "priority",
              "attachments",
            ],
            properties: {
              requestId: { type: "string", format: "uuid" },
              subject: stringSchema(160),
              description: stringSchema(10_000),
              type: { type: "string", enum: [...SUPPORT_TYPES] },
              priority: { type: "string", enum: [...SUPPORT_PRIORITIES] },
              pageUrl: stringSchema(2048),
              attachments: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  required: ["name", "mediaType", "size", "base64"],
                  properties: {
                    name: stringSchema(180),
                    mediaType: stringSchema(120),
                    size: { type: "integer", minimum: 1, maximum: 2_097_152 },
                    base64: stringSchema(2_796_204),
                  },
                },
              },
            },
          }
        )
      )
      .output(
        documented(type<{ ticketId: string; requestedAt: string }>(), {
          type: "object",
          required: ["ticketId", "requestedAt"],
          properties: {
            ticketId: { type: "string", format: "uuid" },
            requestedAt: { type: "string", format: "date-time" },
          },
        })
      )
      .handler(({ context, input }) => get().submit(context.user.id, input)),
  };
}
