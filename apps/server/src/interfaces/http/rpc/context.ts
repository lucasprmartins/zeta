import type { OpenAPI } from "@orpc/openapi";
import { ORPCError, os } from "@orpc/server";
import { can, type Permission } from "@server/infrastructure/auth/access";
import type { Authentication } from "@server/interfaces/http/authentication";

export type RpcContext = { headers: Headers; authentication: Authentication };

export const protectedProcedure = os
  .$context<RpcContext>()
  .use(async ({ context, next }) => {
    const user = await context.authentication.resolveUser(context.headers);
    if (!user) {
      throw new ORPCError("UNAUTHORIZED");
    }
    return next({ context: { user } });
  });

export const requirePermission = (permission: Permission) =>
  os
    .$context<{ user: { id: string; role: string | null; grants: string[] } }>()
    .middleware(async ({ context, next }) => {
      if (!can(context.user.grants, permission)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Você não tem permissão para esta ação.",
        });
      }
      return next();
    });

type DomainFailure = {
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
};

// Base comum de cada módulo RPC: sessão exigida, o mesmo catálogo de erros, a
// tradução dos erros de domínio e a marcação de segurança da documentação.
export function moduleProcedure(options: {
  tag: string;
  translate: (error: unknown) => DomainFailure | null;
}) {
  const procedure = protectedProcedure
    .errors({
      BAD_REQUEST: {},
      UNAUTHORIZED: {},
      FORBIDDEN: {},
      NOT_FOUND: {},
      CONFLICT: {},
    })
    .use(async ({ next }) => {
      try {
        return await next();
      } catch (error) {
        const failure = options.translate(error);
        if (!failure) {
          throw error;
        }
        throw new ORPCError(failure.code, {
          cause: error,
          message: failure.message,
        });
      }
    });
  const route = {
    tags: [options.tag],
    spec: (operation: OpenAPI.OperationObject) => ({
      ...operation,
      security: [{ sessionCookie: [] }],
    }),
  };
  return { procedure, route };
}
