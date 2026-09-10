import type { JSONSchema } from "@orpc/openapi";
import { ORPCError, type } from "@orpc/server";
import type { manageGuides } from "@server/domain/guides/application/manage-guides";
import {
  type Guide,
  GuideError,
  type GuideFields,
} from "@server/domain/guides/entities/guide";
import { permissions } from "@server/infrastructure/auth/access";
import {
  MAX_GUIDE_MARKDOWN,
  parseMarkdown,
  toMarkdown,
} from "@zeta/guide-content";
import { documented } from "../openapi/schema";
import { moduleProcedure, requirePermission } from "./context";
import { object, page, pageSchema, text, textSchema } from "./input";

const string = textSchema;
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
const slugInput = documented(
  type<{ slug: string }>((input) => ({
    slug: text(object(input).slug, { field: "o identificador", max: 100 }),
  })),
  { type: "object", required: ["slug"], properties: { slug: string } }
);
const pageInput = documented(
  type<{ page?: number } | undefined, { page: number }>((input) => ({
    page: page(object(input ?? {}).page),
  })),
  { type: "object", properties: { page: pageSchema } }
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
      markdown = toMarkdown(
        parseMarkdown(
          text(draft.markdown, {
            field: "o conteúdo",
            max: MAX_GUIDE_MARKDOWN,
            required: false,
            trim: false,
          })
        )
      );
    } catch (error) {
      throw new ORPCError("BAD_REQUEST", {
        cause: error,
        message: error instanceof Error ? error.message : "Conteúdo inválido.",
      });
    }
    return {
      slug: text(data.slug, { field: "o identificador", max: 100 }),
      draft: {
        title: text(draft.title, { field: "o título", required: false }),
        section: text(draft.section, {
          field: "a seção",
          max: 80,
          required: false,
        }),
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
const { procedure, route } = moduleProcedure({
  tag: "Guia de uso",
  translate: (error) =>
    error instanceof GuideError
      ? { code: error.code, message: error.message }
      : null,
});
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
