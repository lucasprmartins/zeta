import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// Catálogo público. Novas funcionalidades registram aqui suas ações e rótulos.
export const catalog = [
  { resource: "tasks", label: "Tarefas", actions: [
    { id: "tasks:read", label: "Consultar", description: "Consultar as próprias tarefas." },
    { id: "tasks:create", label: "Criar", description: "Criar tarefas para si." },
    { id: "tasks:update", label: "Editar", description: "Editar as próprias tarefas." },
    { id: "tasks:set-status", label: "Concluir e reabrir", description: "Alterar o estado das próprias tarefas." },
    { id: "tasks:delete", label: "Excluir", description: "Excluir as próprias tarefas." },
  ] },
] as const;
export const permissionIds = catalog.flatMap((resource) => resource.actions.map((action) => action.id));
export const permissions = {
  tasks: { read: ["tasks:read"], create: ["tasks:create"], update: ["tasks:update"], setStatus: ["tasks:set-status"], delete: ["tasks:delete"] },
  access: { manage: ["access:manage"] },
} as const;
export type PermissionId = typeof permissionIds[number] | "access:manage";
export type Permission = readonly PermissionId[];
export function can(grants: readonly string[] | undefined, required: Permission): boolean {
  return required.length > 0 && required.every((id) => grants?.includes(id));
}

// O plugin Admin continua responsável apenas pelas operações nativas de contas/sessões.
// Mutações de papéis e bloqueio de contas não são expostas por esse caminho alternativo.
export const accessControl = createAccessControl(defaultStatements);
export const roles = {
  user: accessControl.newRole({}),
  admin: accessControl.newRole({ user: ["list", "get", "create", "update", "set-email", "set-password"], session: ["list", "revoke"] }),
};
