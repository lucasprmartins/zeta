import { accessControl, roles } from "./access";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, openAPI, username } from "better-auth/plugins";
import type { OpenAPI } from "@orpc/openapi";
import type { Env } from "@server/config/env";
import type { Authentication } from "@server/interfaces/http/authentication";
import type { Database } from "@server/infrastructure/database/client";
import * as schema from "@server/infrastructure/database/schema/auth";

export function createAuthentication(db: Database, env: Env, resolveGrants: (role: string) => Promise<string[]>): Authentication {
  const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    baseURL: env.authUrl,
    basePath: "/api/auth",
    secret: env.authSecret,
    trustedOrigins: env.trustedOrigins,
    // Better Auth relaxa a origem no ambiente de testes por padrão.
    // Mantemos a mesma proteção em desenvolvimento, testes e produção.
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    emailAndPassword: { enabled: true },
    plugins: [admin({ ac: accessControl, roles, defaultRole: "user", adminRoles: ["admin"] }), username(), openAPI({ disableDefaultReference: true })],
  });

  return {
    handle: (request) => auth.handler(request),
    getOpenApiSchema: async () => await auth.api.generateOpenAPISchema() as OpenAPI.Document,
    async resolveUser(headers) {
      const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
      return session && !session.user.banned ? { id: session.user.id, role: session.user.role ?? null, grants: await resolveGrants(session.user.role ?? "") } : null;
    },
  };
}
