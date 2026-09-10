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
