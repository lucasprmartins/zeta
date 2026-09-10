import {
  CaretUpDownIcon,
  CheckSquareIcon,
  GearIcon,
  LayoutIcon,
  type Icon as PhosphorIcon,
  QuestionIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { BlockMark } from "@/components/brand";
import { usePermissions } from "@/components/permission-boundary";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Permission, permissions } from "@/lib/access";
import { cn } from "@/lib/utils";

// Grupos vazios não aparecem para contas sem as permissões correspondentes.
type NavigationItem = {
  label: string;
  to: "/dashboard" | "/tasks";
  icon: PhosphorIcon;
  permission?: Permission;
};
const navigation: { label: string; items: NavigationItem[] }[] = [
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
      },
    ],
  },
];

// Administração fica no rodapé, reunida em um menu para não competir com o trabalho do dia.
type AdministrationItem = {
  label: string;
  to: "/admin/console" | "/admin/users";
  icon: PhosphorIcon;
  permission: Permission;
};
const administration: AdministrationItem[] = [
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

const inRoute = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

// A trilha do cabeçalho nomeia a seção e a página com os mesmos rótulos da navegação.
export function pageBreadcrumb(pathname: string) {
  const admin = administration.find((item) => inRoute(pathname, item.to));
  if (admin) {
    return { section: "Administração", title: admin.label };
  }
  const item = navigation
    .flatMap((group) => group.items)
    .find((entry) => inRoute(pathname, entry.to));
  if (item) {
    return { section: "Workspace", title: item.label };
  }
  if (inRoute(pathname, "/help/guides")) {
    return { section: "Ajuda", title: "Guia de uso" };
  }
  if (inRoute(pathname, "/help")) {
    return { section: "Workspace", title: "Ajuda" };
  }
  if (inRoute(pathname, "/profile")) {
    return { section: "Workspace", title: "Perfil" };
  }
  return { section: "Workspace", title: "Tarefas" };
}

export type SidebarUser = {
  name: string;
  email: string;
  role?: string | null | undefined;
};

type Props = {
  collapsed?: boolean;
  user: SidebarUser;
  leaving: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
};

export function AppSidebar({
  collapsed = false,
  user,
  leaving,
  onSignOut,
  onNavigate,
}: Props) {
  const { can } = usePermissions();
  const { pathname } = useLocation();
  // Na gaveta mobile o menu precisa abrir dentro do dialog, que ocupa a top layer sozinho.
  const [drawer, setDrawer] = useState<HTMLElement | null>(null);
  const attachFooter = useCallback((node: HTMLDivElement | null) => {
    setDrawer(node?.closest("dialog") ?? null);
  }, []);
  const groups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || can(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0);
  const adminItems = administration.filter((item) => can(item.permission));
  const adminActive = adminItems.some((item) => inRoute(pathname, item.to));
  // Preserve o espaço dos rótulos para que os ícones não mudem de posição.
  const labelClass = cn(
    "shrink-0 whitespace-nowrap transition-opacity duration-150",
    collapsed ? "opacity-0" : "opacity-100 delay-75"
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center border-b px-[22px]">
        <Link
          aria-label="Zeta — início"
          className="flex min-w-0 items-center gap-3 rounded-sm"
          onClick={onNavigate}
          to="/dashboard"
        >
          <BlockMark className="size-7 shrink-0" />
          <span
            aria-hidden={collapsed}
            className={cn(
              "font-mono font-semibold text-xl tracking-[-0.08em]",
              labelClass
            )}
          >
            zeta
          </span>
        </Link>
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-7 overflow-y-auto overflow-x-hidden px-3 py-6"
      >
        {groups.map((group) => (
          <section aria-label={group.label} key={group.label}>
            <div className="relative mb-3">
              <p
                aria-hidden={collapsed}
                className={cn(
                  "px-2 font-medium text-[10px] text-muted-foreground uppercase tracking-widest",
                  labelClass
                )}
              >
                {group.label}
              </p>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-1/2 left-3 h-px w-6 -translate-y-1/2 bg-border transition-opacity duration-150",
                  collapsed ? "opacity-100 delay-150" : "opacity-0"
                )}
              />
            </div>
            <ul className="space-y-1">
              {group.items.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link
                    activeOptions={{ exact: true, includeSearch: false }}
                    activeProps={{
                      className: "bg-sidebar-active text-foreground",
                      "aria-current": "page",
                    }}
                    aria-label={collapsed ? label : undefined}
                    className="flex h-12 items-center gap-3 rounded-md px-[15px] text-sm transition-colors hover:bg-sidebar-active hover:text-foreground lg:h-10"
                    inactiveProps={{ className: "text-muted-foreground" }}
                    onClick={onNavigate}
                    search={to === "/tasks" ? { status: "all" } : {}}
                    title={collapsed ? label : undefined}
                    to={to}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[18px] shrink-0"
                      weight="regular"
                    />
                    <span aria-hidden={collapsed} className={labelClass}>
                      {label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t p-3" ref={attachFooter}>
        <Link
          activeOptions={{ exact: true }}
          activeProps={{
            className: "bg-sidebar-active",
            "aria-current": "page",
          }}
          aria-label={`Editar perfil de ${user.name}`}
          className="flex min-h-11 min-w-0 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onNavigate}
          title="Editar perfil"
          to="/profile"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background font-medium text-xs"
          >
            {user.name.trim().slice(0, 1).toUpperCase()}
          </span>
          <div aria-hidden={collapsed} className={cn("w-36", labelClass)}>
            <p className="truncate font-medium text-xs">{user.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {user.email}
            </p>
          </div>
        </Link>
        {adminItems.length > 0 && (
          // Sem modal: o scroll e o foco continuam com o dialog da gaveta no mobile.
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={collapsed ? "Administração" : undefined}
              className={cn(
                buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className:
                    "w-full justify-start gap-3 px-[15px] text-muted-foreground",
                }),
                adminActive && "bg-sidebar-active text-foreground"
              )}
              title={collapsed ? "Administração" : undefined}
            >
              <GearIcon aria-hidden="true" weight="regular" />
              <span aria-hidden={collapsed} className={labelClass}>
                Administração
              </span>
              <CaretUpDownIcon
                aria-hidden="true"
                className={cn("ml-auto", labelClass)}
                weight="regular"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" container={drawer} side="top">
              {adminItems.map(({ label, to, icon: Icon }) => (
                <DropdownMenuItem asChild key={to}>
                  <Link
                    activeOptions={{ exact: false, includeSearch: false }}
                    activeProps={{
                      className: "bg-sidebar-active text-foreground",
                      "aria-current": "page",
                    }}
                    inactiveProps={{ className: "text-muted-foreground" }}
                    onClick={onNavigate}
                    to={to}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[18px] shrink-0"
                      weight="regular"
                    />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Link
          activeOptions={{ exact: false, includeSearch: false }}
          activeProps={{
            className: "bg-sidebar-active text-foreground",
            "aria-current": "page",
          }}
          aria-label={collapsed ? "Ajuda" : undefined}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className:
              "w-full justify-start gap-3 px-[15px] text-muted-foreground",
          })}
          onClick={onNavigate}
          title={collapsed ? "Ajuda" : undefined}
          to="/help"
        >
          <QuestionIcon aria-hidden="true" weight="regular" />
          <span aria-hidden={collapsed} className={labelClass}>
            Ajuda
          </span>
        </Link>
        <Button
          aria-label={leaving ? "Saindo..." : "Sair"}
          className="w-full justify-start gap-3 px-[15px] text-muted-foreground"
          disabled={leaving}
          onClick={onSignOut}
          size="sm"
          title={collapsed ? "Sair" : undefined}
          variant="ghost"
        >
          <SignOutIcon aria-hidden="true" />
          <span aria-hidden={collapsed} className={labelClass}>
            {leaving ? "Saindo…" : "Sair"}
          </span>
        </Button>
      </div>
    </div>
  );
}
