import type { JSONSchema } from "@orpc/openapi";
import { ORPCError, type } from "@orpc/server";
import {
  type Inbox,
  NotificationNotFoundError,
} from "@server/domain/notifications/notifications";
import { documented } from "../openapi/schema";
import { moduleProcedure } from "./context";
import { invalid, object, page, pageSchema, uuid } from "./input";

const { procedure, route } = moduleProcedure({
  tag: "Notificações",
  translate: (error) =>
    error instanceof NotificationNotFoundError
      ? { code: "NOT_FOUND", message: error.message }
      : null,
});
const notification: JSONSchema = {
  type: "object",
  required: [
    "id",
    "kind",
    "title",
    "actorName",
    "referenceType",
    "referenceId",
    "requiredPermission",
    "createdAt",
    "readAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    kind: { type: "string" },
    title: { type: "string" },
    actorName: { type: ["string", "null"] },
    referenceType: { type: "string" },
    referenceId: { type: "string" },
    requiredPermission: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    readAt: { type: ["string", "null"], format: "date-time" },
  },
};
const listInput = documented(
  type<
    { page?: number; filter?: "all" | "unread" } | undefined,
    { page: number; unread: boolean }
  >((input) => {
    const data = object(input ?? {});
    if (
      data.filter !== undefined &&
      data.filter !== "all" &&
      data.filter !== "unread"
    ) {
      invalid("Filtro de notificações inválido.");
    }
    return { page: page(data.page), unread: data.filter === "unread" };
  }),
  {
    type: "object",
    properties: {
      page: pageSchema,
      filter: { type: "string", enum: ["all", "unread"] },
    },
  }
);

export function createNotificationsRouter(service?: Inbox) {
  function get() {
    if (!service) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
    return service;
  }
  return {
    list: procedure
      .route({
        ...route,
        method: "GET",
        path: "/notifications",
        summary: "Listar minha caixa de entrada",
      })
      .input(listInput)
      .output(
        documented(type<Awaited<ReturnType<Inbox["list"]>>>(), {
          type: "object",
          required: ["items", "hasMore"],
          properties: {
            items: { type: "array", items: notification, maxItems: 20 },
            hasMore: { type: "boolean" },
          },
        })
      )
      .handler(({ context, input }) =>
        get().list(
          { recipientId: context.user.id, grants: context.user.grants },
          input
        )
      ),
    unreadCount: procedure
      .route({
        ...route,
        method: "GET",
        path: "/notifications/unread-count",
        summary: "Contar minhas notificações não lidas",
      })
      .output(
        documented(type<{ count: number }>(), {
          type: "object",
          required: ["count"],
          properties: { count: { type: "integer", minimum: 0 } },
        })
      )
      .handler(({ context }) =>
        get().unreadCount({
          recipientId: context.user.id,
          grants: context.user.grants,
        })
      ),
    markRead: procedure
      .route({
        ...route,
        method: "PATCH",
        path: "/notifications/{id}/read",
        summary: "Marcar minha notificação como lida",
      })
      .input(
        documented(
          type<{ id: string }>((input) => ({ id: uuid(object(input).id) })),
          {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string", format: "uuid" } },
          }
        )
      )
      .output(
        documented(type<{ success: boolean }>(), {
          type: "object",
          required: ["success"],
          properties: { success: { type: "boolean" } },
        })
      )
      .handler(({ context, input }) =>
        get().markRead(
          { recipientId: context.user.id, grants: context.user.grants },
          input.id
        )
      ),
  };
}
