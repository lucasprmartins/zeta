import type {
  AccessRepository,
  AccessStore,
} from "../contracts/access-repository";
import type { RegistrationPolicy } from "../entities/registration-policy";
import { AccessError, effectiveRoleGrants, roleFields } from "../entities/role";

export function manageAccess(
  repository: AccessRepository,
  available: readonly string[],
  generateId: () => string
) {
  async function authorize(store: AccessStore, actorId: string) {
    const actor = await store.user(actorId);
    if (!actor || actor.banned || actor.role !== "admin") {
      throw new AccessError(
        "FORBIDDEN",
        "Você não tem permissão para administrar o acesso."
      );
    }
  }
  return {
    registrationPolicy: () => repository.registrationPolicy(),
    async registrationStatus(actorId: string) {
      await authorize(repository, actorId);
      return {
        ...(await repository.registrationPolicy()),
        pendingCount: await repository.pendingCount(),
      };
    },
    saveRegistrationPolicy(actorId: string, policy: RegistrationPolicy) {
      return repository.transaction(async (store) => {
        await authorize(store, actorId);
        await store.saveRegistrationPolicy(policy);
        return policy;
      });
    },
    async pendingUsers(actorId: string, page: number) {
      await authorize(repository, actorId);
      return repository.pendingUsers(page);
    },
    approve(actorId: string, userId: string) {
      return repository.transaction(async (store) => {
        await authorize(store, actorId);
        if (!(await store.approve(userId))) {
          throw new AccessError(
            "NOT_FOUND",
            "Cadastro pendente não encontrado."
          );
        }
        return { userId };
      });
    },
    async listRoles(actorId: string) {
      await authorize(repository, actorId);
      return (await repository.roles()).map((role) => ({
        ...role,
        grants: effectiveRoleGrants(role, available),
      }));
    },
    async listUsers(actorId: string, page: number, search: string) {
      await authorize(repository, actorId);
      return repository.users(page, search);
    },
    save(
      actorId: string,
      input: { id?: string; name: string; grants: string[]; color?: string }
    ) {
      const fields = roleFields(
        input.name,
        input.id === "admin" ? [] : input.grants,
        available,
        input.color
      );
      return repository.transaction(async (store) => {
        await authorize(store, actorId);
        const existing = input.id ? await store.role(input.id) : null;
        if (input.id && !existing) {
          throw new AccessError("NOT_FOUND", "Papel não encontrado.");
        }
        const roles = await store.roles();
        if (
          roles.some(
            (role) =>
              role.id !== input.id &&
              role.name.toLowerCase() === fields.name.toLowerCase()
          )
        ) {
          throw new AccessError(
            "CONFLICT",
            "Já existe um papel com esse nome."
          );
        }
        if (!existing && roles.length >= 100) {
          throw new AccessError("CONFLICT", "Limite de 100 papéis atingido.");
        }
        const role = {
          id: existing?.id ?? generateId(),
          ...fields,
          color:
            input.color === undefined
              ? (existing?.color ?? fields.color)
              : fields.color,
          grants:
            existing?.id === "admin"
              ? effectiveRoleGrants(existing, available)
              : fields.grants,
          protected: existing?.protected ?? false,
        };
        await store.save(role);
        return role;
      });
    },
    remove(actorId: string, id: string) {
      return repository.transaction(async (store) => {
        await authorize(store, actorId);
        const role = await store.role(id);
        if (!role) {
          throw new AccessError("NOT_FOUND", "Papel não encontrado.");
        }
        if (role.protected) {
          throw new AccessError(
            "FORBIDDEN",
            "Papéis do sistema não podem ser excluídos."
          );
        }
        if (await store.assigned(id)) {
          throw new AccessError(
            "CONFLICT",
            "Reatribua os usuários deste papel antes de excluí-lo."
          );
        }
        await store.remove(id);
        return { id };
      });
    },
    assign(actorId: string, userId: string, roleId: string) {
      return repository.transaction(async (store) => {
        await authorize(store, actorId);
        await assignRole(store, userId, roleId);
        return { userId, roleId };
      });
    },
  };
}
// Também usado pelo comando operacional de bootstrap, sem simular uma sessão HTTP.
export async function assignRole(
  store: AccessStore,
  userId: string,
  roleId: string
) {
  const [account, role] = await Promise.all([
    store.user(userId),
    store.role(roleId),
  ]);
  if (!(account && role)) {
    throw new AccessError("NOT_FOUND", "Conta ou papel não encontrado.");
  }
  if (
    account.role === "admin" &&
    !account.banned &&
    roleId !== "admin" &&
    (await store.activeAdmins()) <= 1
  ) {
    throw new AccessError(
      "CONFLICT",
      "Mantenha pelo menos um administrador ativo."
    );
  }
  await store.assign(userId, roleId);
}
