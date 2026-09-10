import {
  CaretRightIcon,
  ListIcon,
  SidebarSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { AppSidebar, type SidebarUser } from "./app-sidebar";

const preferenceKey = "zeta:sidebar-collapsed";

function readPreference() {
  try {
    return localStorage.getItem(preferenceKey) === "true";
  } catch {
    return false;
  }
}

type Props = {
  title: string;
  user: SidebarUser;
  leaving: boolean;
  onSignOut: () => void;
  children: ReactNode;
};

export function AppShell({ title, user, leaving, onSignOut, children }: Props) {
  const [collapsed, setCollapsed] = useState(readPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(preferenceKey, String(collapsed));
    } catch {
      /* A navegação continua funcionando se o armazenamento estiver indisponível. */
    }
  }, [collapsed]);

  useEffect(() => {
    const dialog = mobileDialog.current;
    if (!dialog) {
      return;
    }
    if (mobileOpen && !dialog.open) {
      dialog.showModal();
    }
    if (!mobileOpen && dialog.open) {
      dialog.close();
    }
    if (!mobileOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        setMobileOpen(false);
      }
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const sidebarProps = { user, leaving, onSignOut };
  return (
    <div className="min-h-svh bg-background">
      <a
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        href="#main-content"
      >
        Ir para o conteúdo
      </a>

      <aside
        aria-label="Menu lateral"
        className={`fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-60"}`}
        data-collapsed={collapsed}
        id="desktop-sidebar"
      >
        <AppSidebar {...sidebarProps} collapsed={collapsed} />
      </aside>

      <div
        className={`min-w-0 transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-60"}`}
      >
        <header className="app-topbar sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <Button
            aria-controls="desktop-sidebar"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            className="hidden size-8 lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            size="icon"
            title={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            variant="ghost"
          >
            <SidebarSimpleIcon aria-hidden="true" />
          </Button>
          <button
            aria-controls="mobile-sidebar"
            aria-expanded={mobileOpen}
            aria-label="Abrir menu"
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            ref={menuTrigger}
            type="button"
          >
            <ListIcon className="size-[18px]" />
          </button>
          <div aria-hidden="true" className="h-4 w-px bg-border" />
          <nav aria-label="Localização" className="min-w-0 text-xs">
            <ol className="flex items-center gap-2">
              <li className="hidden text-muted-foreground sm:block">
                Workspace
              </li>
              <li aria-hidden="true" className="hidden sm:block">
                <CaretRightIcon className="size-3 text-muted-foreground" />
              </li>
              <li aria-current="page" className="truncate font-medium">
                {title}
              </li>
            </ol>
          </nav>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>
        <main className="outline-none" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape é tratado por onCancel do dialog nativo. */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: o clique só fecha a gaveta pelo backdrop. */}
      <dialog
        aria-label="Menu de navegação"
        className="mobile-drawer border-0 border-r bg-sidebar p-0 text-foreground shadow-xl backdrop:bg-black/30"
        id="mobile-sidebar"
        onCancel={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            ) {
              setMobileOpen(false);
            }
          }
        }}
        onClose={() => {
          setMobileOpen(false);
          if (window.matchMedia("(max-width: 1023px)").matches) {
            menuTrigger.current?.focus();
          }
        }}
        ref={mobileDialog}
      >
        <div className="relative h-full">
          <Button
            aria-label="Fechar menu"
            className="absolute top-2.5 right-3 z-10 size-11"
            onClick={() => setMobileOpen(false)}
            size="icon"
            variant="ghost"
          >
            <XIcon />
          </Button>
          <AppSidebar
            {...sidebarProps}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </dialog>
    </div>
  );
}
