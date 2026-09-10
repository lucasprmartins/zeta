import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// Catálogo público. Novas funcionalidades registram aqui suas ações e rótulos.
export const catalog = [
  {
    resource: "tasks",
    label: "Tarefas",
    actions: [
      {
        id: "tasks:read",
        label: "Consultar",
        description: "Consultar as tarefas de todas as contas.",
      },
      {
        id: "tasks:create",
        label: "Criar",
        description: "Criar tarefas.",
      },
      {
        id: "tasks:update",
        label: "Editar",
        description: "Editar qualquer tarefa.",
      },
      {
        id: "tasks:set-status",
        label: "Concluir e reabrir",
        description: "Alterar o estado de qualquer tarefa.",
      },
      {
        id: "tasks:delete",
        label: "Excluir",
        description: "Excluir qualquer tarefa.",
      },
      {
        id: "tasks:mention",
        label: "Mencionar contas",
        description:
          "Consultar as contas do sistema e indicar quem está relacionado a uma tarefa.",
      },
    ],
  },
] as const;
export const permissionIds = catalog.flatMap((resource) =>
  resource.actions.map((action) => action.id)
);
export const permissions = {
  tasks: {
    read: ["tasks:read"],
    create: ["tasks:create"],
    update: ["tasks:update"],
    setStatus: ["tasks:set-status"],
    delete: ["tasks:delete"],
    mention: ["tasks:mention"],
  },
  access: { manage: ["access:manage"] },
} as const;
export type PermissionId = (typeof permissionIds)[number] | "access:manage";
export type Permission = readonly PermissionId[];
export function can(
  grants: readonly string[] | undefined,
  required: Permission
): boolean {
  return required.length > 0 && required.every((id) => grants?.includes(id));
}

// O plugin Admin continua responsável apenas pelas operações nativas de contas/sessões.
// Mutações de papéis e bloqueio de contas não são expostas por esse caminho alternativo.
export const accessControl = createAccessControl(defaultStatements);
export const roles = {
  user: accessControl.newRole({}),
  admin: accessControl.newRole({
    user: ["list", "get", "create", "update", "set-email", "set-password"],
    session: ["list", "revoke"],
  }),
};
