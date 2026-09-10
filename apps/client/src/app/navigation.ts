import {
  CheckSquareIcon,
  LayoutIcon,
  type Icon as PhosphorIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { type Permission, permissions } from "@/lib/access";

// Trocar o domínio de exemplo por outro é uma edição só neste arquivo.
export type NavigationItem = {
  label: string;
  to: "/dashboard" | "/tasks";
  icon: PhosphorIcon;
  permission?: Permission;
  // Destinos com filtro padrão declaram o próprio parâmetro; o menu não decide.
  search?: Record<string, unknown>;
};

// Grupos vazios não aparecem para contas sem as permissões correspondentes.
export const navigation: { label: string; items: NavigationItem[] }[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutIcon,
        permission: permissions.tasks.read,
      },
      {
        label: "Tarefas",
        to: "/tasks",
        icon: CheckSquareIcon,
        permission: permissions.tasks.read,
        search: { status: "all" },
      },
    ],
  },
];

// Administração fica no rodapé, reunida em um menu para não competir com o
// trabalho do dia.
export type AdministrationItem = {
  label: string;
  to: "/admin/console" | "/admin/users";
  icon: PhosphorIcon;
  permission: Permission;
};

export const administration: AdministrationItem[] = [
  {
    label: "Console",
    to: "/admin/console",
    icon: SlidersHorizontalIcon,
    permission: permissions.access.manage,
  },
  {
    label: "Usuários",
    to: "/admin/users",
    icon: UsersIcon,
    permission: permissions.access.manage,
  },
];
