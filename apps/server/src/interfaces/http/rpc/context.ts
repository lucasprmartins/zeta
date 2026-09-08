import { ORPCError, os } from "@orpc/server";
import type { Authentication } from "@server/interfaces/http/authentication";

export type RpcContext = { headers: Headers; authentication: Authentication };

export const protectedProcedure = os.$context<RpcContext>().use(async ({ context, next }) => {
  const user = await context.authentication.resolveUser(context.headers);
  if (!user) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { user } });
});
