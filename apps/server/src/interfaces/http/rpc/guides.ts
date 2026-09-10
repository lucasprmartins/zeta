import type { JSONSchema } from "@orpc/openapi";
import { ORPCError, type } from "@orpc/server";
import type { manageGuides } from "@server/domain/guides/application/manage-guides";
import {
  type Guide,
  GuideError,
  type GuideFields,
} from "@server/domain/guides/entities/guide";
import { permissions } from "@server/infrastructure/auth/access";
import { parseMarkdown, toMarkdown } from "@zeta/guide-content";
import { documented } from "../openapi/schema";
import { protectedProcedure, requirePermission } from "./context";

const string: JSONSchema = { type: "string" };
const fieldsSchema = {
  type: "object",
  required: ["title", "section", "order", "markdown", "permissions"],
  properties: {
    title: string,
    section: string,
    order: { type: "integer" },
    markdown: string,
    permissions: { type: "array", items: string },
  },
} satisfies JSONSchema;
const guideSchema: JSONSchema = {
  type: "object",
  required: ["slug", "draft", "published", "version", "updatedAt"],
  properties: {
    slug: string,
    draft: fieldsSchema,
    published: { anyOf: [fieldsSchema, { type: "null" }] },
    version: { type: "integer" },
    updatedAt: string,
  },
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ORPCError("BAD_REQUEST");
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 120): string {
  if (typeof value !== "string" || value.length > max) {
    throw new ORPCError("BAD_REQUEST");
  }
  return value;
}
const slugInput = documented(
  type<{ slug: string }>((input) => ({ slug: text(object(input).slug, 100) })),
  { type: "object", required: ["slug"], properties: { slug: string } }
);
const pageInput = documented(
  type<{ page?: number } | undefined, { page: number }>((input) => {
    const page = Number(object(input ?? {}).page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
      throw new ORPCError("BAD_REQUEST");
    }
    return { page };
  }),
  {
    type: "object",
    properties: { page: { type: "integer", minimum: 1, maximum: 1_000_000 } },
  }
);
const saveInput = documented(
  type<{
    slug: string;
    draft: GuideFields;
    version?: number;
    action: "draft" | "publish" | "unpublish";
  }>((input) => {
    const data = object(input),
      draft = object(data.draft);
    if (
      typeof draft.order !== "number" ||
      !(
        Array.isArray(draft.permissions) &&
        draft.permissions.every((permission) => typeof permission === "string")
      ) ||
      !["draft", "publish", "unpublish"].includes(String(data.action)) ||
      (data.version !== undefined &&
        (!Number.isSafeInteger(data.version) || Number(data.version) < 1))
    ) {
      throw new ORPCError("BAD_REQUEST");
    }
    let markdown: string;
    try {
      markdown = toMarkdown(parseMarkdown(text(draft.markdown, 50_000)));
    } catch (error) {
      throw new ORPCError("BAD_REQUEST", {
        cause: error,
        message: error instanceof Error ? error.message : "Conteúdo inválido.",
      });
    }
    return {
      slug: text(data.slug, 100),
      draft: {
        title: text(draft.title),
        section: text(draft.section, 80),
        order: draft.order,
        markdown,
        permissions: draft.permissions as string[],
      },
      ...(data.version === undefined
        ? {}
        : { version: data.version as number }),
      action: data.action as "draft" | "publish" | "unpublish",
    };
  }),
  {
    type: "object",
    required: ["slug", "draft", "action"],
    properties: {
      slug: string,
      draft: fieldsSchema,
      version: { type: "integer", minimum: 1 },
      action: { enum: ["draft", "publish", "unpublish"] },
    },
  }
);
const procedure = protectedProcedure
  .errors({
    BAD_REQUEST: {},
    NOT_FOUND: {},
    CONFLICT: {},
    UNAUTHORIZED: {},
    FORBIDDEN: {},
  })
  .use(async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof GuideError) {
        throw new ORPCError(error.code, {
          cause: error,
          message: error.message,
        });
      }
      throw error;
    }
  });
const route = {
  tags: ["Guia de uso"],
  spec: (operation: import("@orpc/openapi").OpenAPI.OperationObject) => ({
    ...operation,
    security: [{ sessionCookie: [] }],
  }),
};
export function createGuidesRouter(service?: ReturnType<typeof manageGuides>) {
  const get = () => {
    if (!service) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }
    return service;
  };
  const admin = procedure.use(requirePermission(permissions.access.manage));
  return {
    list: procedure
      .route({
        ...route,
        method: "GET",
        path: "/guides",
        summary: "Listar guias publicados permitidos",
      })
      .input(pageInput)
      .output(
        documented(
          type<{
            items: {
              slug: string;
              title: string;
              section: string;
              order: number;
            }[];
            hasMore: boolean;
          }>(),
          {
            type: "object",
            required: ["items", "hasMore"],
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    slug: string,
                    title: string,
                    section: string,
                    order: { type: "integer" },
                  },
                  required: ["slug", "title", "section", "order"],
                },
              },
              hasMore: { type: "boolean" },
            },
          }
        )
      )
      .handler(({ context, input }) =>
        get().list(input.page, context.user.grants)
      ),
    read: procedure
      .route({
        ...route,
        method: "GET",
        path: "/guides/{slug}",
        summary: "Ler versão publicada",
      })
      .input(slugInput)
      .output(
        documented(type<GuideFields & { slug: string }>(), {
          ...fieldsSchema,
          required: [...fieldsSchema.required, "slug"],
          properties: { ...fieldsSchema.properties, slug: string },
        })
      )
      .handler(({ input, context }) =>
        get().read(input.slug, context.user.grants)
      ),
    adminList: admin
      .route({
        ...route,
        method: "GET",
        path: "/admin/guides",
        summary: "Listar rascunhos e publicações",
      })
      .input(pageInput)
      .output(
        documented(type<{ items: Guide[]; hasMore: boolean }>(), {
          type: "object",
          required: ["items", "hasMore"],
          properties: {
            items: { type: "array", items: guideSchema },
            hasMore: { type: "boolean" },
          },
        })
      )
      .handler(({ input }) => get().adminList(input.page)),
    adminGet: admin
      .route({
        ...route,
        method: "GET",
        path: "/admin/guides/{slug}",
        summary: "Carregar guia para edição",
      })
      .input(slugInput)
      .output(documented(type<Guide>(), guideSchema))
      .handler(({ input }) => get().adminGet(input.slug)),
    save: admin
      .route({
        ...route,
        method: "POST",
        path: "/admin/guides",
        summary: "Salvar, publicar ou retirar guia de publicação",
      })
      .input(saveInput)
      .output(documented(type<Guide>(), guideSchema))
      .handler(({ input }) => get().save(input)),
  };
}
