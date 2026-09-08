import { Link } from "@tanstack/react-router";
import { LayoutIcon, CheckSquareIcon, SignOutIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { BlockMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Registre aqui as entradas dos próximos módulos do aplicativo.
const navigation: { label: string; to: "/dashboard" | "/tasks"; icon: PhosphorIcon }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutIcon },
  { label: "Tarefas", to: "/tasks", icon: CheckSquareIcon },
];

export type SidebarUser = { name: string; email: string };

type Props = {
  collapsed?: boolean;
  user: SidebarUser;
  leaving: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
};

export function AppSidebar({ collapsed = false, user, leaving, onSignOut, onNavigate }: Props) {
  // Preserve o espaço dos rótulos para que os ícones não mudem de posição.
  const labelClass = cn("shrink-0 whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100 delay-75");

  return <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <div className="flex h-16 shrink-0 items-center border-b px-[22px]">
      <Link to="/dashboard" aria-label="Zeta — início" onClick={onNavigate} className="flex min-w-0 items-center gap-3 rounded-sm">
        <BlockMark className="size-7 shrink-0" />
        <span aria-hidden={collapsed} className={cn("font-mono text-xl font-semibold tracking-[-0.08em]", labelClass)}>zeta</span>
      </Link>
    </div>

    <nav aria-label="Navegação principal" className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-6">
      <div className="relative mb-3">
        <p aria-hidden={collapsed} className={cn("px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground", labelClass)}>Workspace</p>
        <span aria-hidden="true" className={cn("pointer-events-none absolute left-3 top-1/2 h-px w-6 -translate-y-1/2 bg-border transition-opacity duration-150", collapsed ? "opacity-100 delay-150" : "opacity-0")} />
      </div>
      <ul className="space-y-1">
        {navigation.map(({ label, to, icon: Icon }) => <li key={to}>
          <Link
            to={to}
            search={to === "/tasks" ? { status: "all" } : {}}
            activeOptions={{ exact: true, includeSearch: false }}
            activeProps={{ className: "bg-sidebar-active text-foreground", "aria-current": "page" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            onClick={onNavigate}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className="flex h-12 items-center gap-3 lg:h-10 rounded-md px-[15px] text-sm transition-colors hover:bg-sidebar-active hover:text-foreground"
          >
            <Icon className="size-[18px] shrink-0" weight="regular" aria-hidden="true" />
            <span aria-hidden={collapsed} className={labelClass}>{label}</span>
          </Link>
        </li>)}
      </ul>
    </nav>

    <div className="shrink-0 space-y-3 border-t p-3">
      <Link to="/profile" onClick={onNavigate} aria-label={`Editar perfil de ${user.name}`} title="Editar perfil"
        activeOptions={{ exact: true }} activeProps={{ className: "bg-sidebar-active", "aria-current": "page" }}
        className="flex min-h-11 min-w-0 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-offset-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-white text-xs font-medium" aria-hidden="true">{user.name.trim().slice(0, 1).toUpperCase()}</span>
        <div aria-hidden={collapsed} className={cn("w-36", labelClass)}>
          <p className="truncate text-xs font-medium">{user.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 px-[15px] text-muted-foreground"
        onClick={onSignOut}
        disabled={leaving}
        aria-label={leaving ? "Saindo..." : "Sair"}
        title={collapsed ? "Sair" : undefined}
      >
        <SignOutIcon aria-hidden="true" />
        <span aria-hidden={collapsed} className={labelClass}>{leaving ? "Saindo…" : "Sair"}</span>
      </Button>
    </div>
  </div>;
}
