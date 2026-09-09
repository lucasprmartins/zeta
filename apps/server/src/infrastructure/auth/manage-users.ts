import { APIError } from "better-auth/api";
import { sql } from "drizzle-orm";
import type { Env } from "@server/config/env";
import type { Database } from "@server/infrastructure/database/client";
import type { UserFields, UserManagement } from "@server/interfaces/http/user-management";
import { AccessError } from "@server/domain/authorization/entities/role";
import { assignRole } from "@server/domain/authorization/application/manage-access";
import { createAccessRepository } from "@server/infrastructure/repositories/drizzle-access-repository";
import { createBetterAuth } from "./better-auth";

function validate(input: UserFields, creating: boolean) {
  const name = input.name.trim();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || name.length > 120) throw new AccessError("BAD_REQUEST", "Use um nome de 1 a 120 caracteres.");
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) throw new AccessError("BAD_REQUEST", "O nome de usuário deve ter de 3 a 30 caracteres: letras sem acento, números, ponto ou sublinhado.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError("BAD_REQUEST", "Informe um e-mail válido.");
  if ((creating && !input.password) || (input.password !== undefined && (input.password.length < 8 || input.password.length > 128))) throw new AccessError("BAD_REQUEST", "A senha deve ter de 8 a 128 caracteres.");
  return { ...input, name, username, email };
}
function translate(error: unknown): never {
  if (error instanceof AccessError) throw error;
  if (error instanceof APIError) {
    const code = error.body?.code;
    if (typeof code === "string" && /USERNAME.*TAKEN|USER_ALREADY_EXISTS|EMAIL_ALREADY/.test(code)) throw new AccessError("CONFLICT", "Este nome de usuário ou e-mail já está em uso.");
    if (error.statusCode === 401 || error.statusCode === 403) throw new AccessError("FORBIDDEN", "Você não tem permissão para gerenciar usuários.");
    if (error.statusCode === 404) throw new AccessError("NOT_FOUND", "Usuário não encontrado.");
    if (error.statusCode < 500) throw new AccessError("BAD_REQUEST", "Confira os dados da conta e os requisitos da senha.");
  }
  // Também trata conflitos concorrentes com o cadastro e a edição do próprio perfil.
  let cause: unknown = error;
  for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
    if ("code" in cause && cause.code === "23505") throw new AccessError("CONFLICT", "Este nome de usuário ou e-mail já está em uso.");
    cause = "cause" in cause ? cause.cause : undefined;
  }
  throw new Error("Não foi possível salvar a conta.");
}

export function createUserManagement(db: Database, env: Env): UserManagement {
  async function save(headers: Headers, raw: UserFields, targetId?: string) {
    const input = validate(raw, targetId === undefined);
    try {
      return await db.transaction(async (tx) => {
        // Mesmo lock do módulo de papéis: atribuição, dados e senha são atômicos.
        await tx.execute(sql`select pg_advisory_xact_lock(782341901)`);
        const auth = createBetterAuth(tx, env);
        const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
        if (!session || session.user.role !== "admin" || session.user.banned) throw new AccessError("FORBIDDEN", "Você não tem permissão para gerenciar usuários.");
        const store = createAccessRepository(tx);
        if (!await store.role(input.roleId)) throw new AccessError("NOT_FOUND", "Papel não encontrado.");
        let userId: string;
        if (targetId === undefined) {
          // O plugin cria conta e credencial; a atribuição dinâmica é feita pelo domínio.
          const result = await auth.api.createUser({ headers, body: { name: input.name, email: input.email, password: input.password!, data: { username: input.username, displayUsername: input.username } } });
          userId = result.user.id;
        } else {
          const current = await store.user(targetId);
          if (!current) throw new AccessError("NOT_FOUND", "Usuário não encontrado.");
          await auth.api.adminUpdateUser({ headers, body: { userId: targetId, data: {
            name: input.name, email: input.email,
            ...(current.email !== input.email ? { emailVerified: false } : {}),
            // O plugin valida apenas quando o username canônico realmente muda.
            ...(current.username !== input.username.toLowerCase() ? { username: input.username } : {}),
            displayUsername: input.username,
          } } });
          if (input.password !== undefined) {
            await auth.api.setUserPassword({ headers, body: { userId: targetId, newPassword: input.password } });
            await auth.api.revokeUserSessions({ headers, body: { userId: targetId } });
          }
          userId = targetId;
        }
        await assignRole(store, userId, input.roleId);
        const result = await store.user(userId);
        if (!result) throw new AccessError("NOT_FOUND", "Usuário não encontrado.");
        return result;
      });
    } catch (error) { return translate(error); }
  }
  return { create: (headers, input) => save(headers, input), update: (headers, input) => save(headers, input, input.userId) };
}
