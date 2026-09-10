import { expect, test } from "bun:test";
import { manageAccess } from "@server/domain/authorization/application/manage-access";
import type { AccessRepository, AccessUser } from "@server/domain/authorization/contracts/access-repository";
import { roleFields, effectiveRoleGrants, type AccessRole } from "@server/domain/authorization/entities/role";

function setup() {
  const roles = new Map<string, AccessRole>([
    ["admin", { id: "admin", name: "Administrador", color: "#737373", grants: ["access:manage"], protected: true }],
    ["user", { id: "user", name: "Usuário", color: "#737373", grants: ["tasks:read"], protected: true }],
  ]);
  const users = new Map<string, AccessUser>([
    ["a", { id: "a", name: "Admin", email: "a@test", username: null, role: "admin", banned: false }],
    ["u", { id: "u", name: "User", email: "u@test", username: null, role: "user", banned: false }],
  ]);
  const repository: AccessRepository = {
    registrationPolicy: async () => ({ allowSignUp: true, requireApproval: false }),
    saveRegistrationPolicy: async () => {}, pendingUsers: async () => ({ items: [], hasMore: false }), pendingCount: async () => 0, approve: async () => false,
    role: async (id) => roles.get(id) ?? null,
    roles: async () => [...roles.values()],
    user: async (id) => users.get(id) ?? null,
    users: async () => ({ items: [...users.values()], hasMore: false }),
    save: async (role) => { roles.set(role.id, role); },
    remove: async (id) => { roles.delete(id); },
    assigned: async (id) => [...users.values()].some((user) => user.role === id),
    assign: async (id, role) => { users.set(id, { ...users.get(id)!, role }); },
    activeAdmins: async () => [...users.values()].filter((user) => user.role === "admin" && !user.banned).length,
    transaction: async (work) => work(repository),
  };
  return { service: manageAccess(repository, ["tasks:read", "tasks:create"], () => "custom"), users, roles };
}

test("papéis normalizam nomes e concessões, rejeitando ações fora do catálogo", () => {
  expect(roleFields("  Operador  ", ["tasks:read", "tasks:read"], ["tasks:read"])).toEqual({ name: "Operador", color: "#737373", grants: ["tasks:read"] });
  expect(() => roleFields("Cor inválida", [], [], "red")).toThrow("hexadecimal");
  for (const name of [" ", "x".repeat(61)]) expect(() => roleFields(name, [], [])).toThrow();
  expect(() => roleFields("Operador", ["access:manage"], ["tasks:read"])).toThrow("reservada");
});

test("aplicação revalida administradores e protege papéis do sistema e atribuições", async () => {
  const { service, users } = setup();
  await expect(service.save("u", { name: "Negado", grants: [] })).rejects.toThrow("permissão");
  const admin = await service.save("a", { id: "admin", name: "Alterado", color: "#AA33FF", grants: [] });
  expect(admin).toMatchObject({ name: "Alterado", color: "#aa33ff", protected: true, grants: ["tasks:read", "tasks:create", "access:manage"] });
  const role = await service.save("a", { name: "Leitor", grants: ["tasks:read"] });
  await expect(service.save("a", { name: "leitor", grants: [] })).rejects.toThrow("Já existe");
  await service.assign("a", "u", role.id);
  await expect(service.remove("a", role.id)).rejects.toThrow("Reatribua");
  await expect(service.assign("a", "a", "user")).rejects.toThrow("administrador ativo");
  await service.assign("a", "u", "user");
  await service.remove("a", role.id);
  users.set("a", { ...users.get("a")!, banned: true });
  await expect(service.listRoles("a")).rejects.toThrow("permissão");
});


test("administrador recebe funcionalidades futuras, sem liberar outras contas", () => {
  const available = ["tasks:read", "reports:export"];
  expect(effectiveRoleGrants({ id: "admin", grants: [] }, available)).toEqual([...available, "access:manage"]);
  expect(effectiveRoleGrants({ id: "user", grants: ["tasks:read"] }, available)).toEqual(["tasks:read"]);
  expect(effectiveRoleGrants({ id: "custom", grants: ["access:manage", "removed:action"] }, available)).toEqual([]);
});
