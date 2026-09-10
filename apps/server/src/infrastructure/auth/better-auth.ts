import type { OpenAPI } from "@orpc/openapi";
import type { Env } from "@server/config/env";
import {
  defaultRegistrationPolicy,
  type RegistrationPolicy,
} from "@server/domain/authorization/entities/registration-policy";
import type {
  Database,
  DatabaseConnection,
} from "@server/infrastructure/database/client";
import * as schema from "@server/infrastructure/database/schema/auth";
import { createAccessRepository } from "@server/infrastructure/repositories/drizzle-access-repository";
import type { Authentication } from "@server/interfaces/http/authentication";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { admin, openAPI, username } from "better-auth/plugins";
import { eq, sql } from "drizzle-orm";
import { accessControl, roles } from "./access";

export function createBetterAuth(
  db: DatabaseConnection,
  env: Env,
  policy: RegistrationPolicy = defaultRegistrationPolicy
) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    baseURL: env.authUrl,
    basePath: "/api/auth",
    secret: env.authSecret,
    trustedOrigins: env.trustedOrigins,
    // Better Auth relaxa a origem no ambiente de testes por padrão.
    // Mantemos a mesma proteção em desenvolvimento, testes e produção.
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    disabledPaths: [
      "/admin/create-user",
      "/admin/update-user",
      "/admin/set-user-password",
    ],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !policy.allowSignUp,
      autoSignIn: !policy.requireApproval,
    },
    user: {
      additionalFields: {
        approvalPending: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (account, context) => {
            const administrative = context?.path === "/admin/create-user";
            if (!(administrative || policy.allowSignUp)) {
              throw new APIError("FORBIDDEN", {
                code: "SIGNUP_DISABLED",
                message: "O cadastro de novas contas está desativado.",
              });
            }
            return {
              data: {
                ...account,
                approvalPending: !administrative && policy.requireApproval,
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const account = (
              await db
                .select({ pending: schema.user.approvalPending })
                .from(schema.user)
                .where(eq(schema.user.id, session.userId))
                .limit(1)
            )[0];
            if (account?.pending) {
              throw new APIError("FORBIDDEN", {
                code: "ACCOUNT_PENDING_APPROVAL",
                message: "Sua conta aguarda aprovação de um administrador.",
              });
            }
          },
        },
      },
    },
    plugins: [
      admin({
        ac: accessControl,
        roles,
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
      username(),
      openAPI({ disableDefaultReference: true }),
    ],
  });
}

export function createAuthentication(
  db: Database,
  env: Env,
  resolveGrants: (role: string) => Promise<string[]>
): Authentication {
  const auth = createBetterAuth(db, env);
  return {
    async handle(request) {
      // Cadastro e alteração da política compartilham o lock das mutações administrativas.
      if (
        request.method === "POST" &&
        new URL(request.url).pathname.replace(/\/+$/, "") ===
          "/api/auth/sign-up/email"
      ) {
        return db.transaction(async (tx) => {
          await tx.execute(sql`select pg_advisory_xact_lock(782341901)`);
          const policy = await createAccessRepository(tx).registrationPolicy();
          return createBetterAuth(tx, env, policy).handler(request);
        });
      }
      const policy = await createAccessRepository(db).registrationPolicy();
      return createBetterAuth(db, env, policy).handler(request);
    },
    getOpenApiSchema: async () =>
      (await auth.api.generateOpenAPISchema()) as OpenAPI.Document,
    async resolveUser(headers) {
      const session = await auth.api.getSession({
        headers,
        query: { disableCookieCache: true },
      });
      return session && !session.user.banned && !session.user.approvalPending
        ? {
            id: session.user.id,
            role: session.user.role ?? null,
            grants: await resolveGrants(session.user.role ?? ""),
          }
        : null;
    },
  };
}
