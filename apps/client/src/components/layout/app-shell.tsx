import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretRightIcon, ListIcon, SidebarSimpleIcon, XIcon } from "@phosphor-icons/react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { AppSidebar, type SidebarUser } from "./app-sidebar";

const preferenceKey = "zeta:sidebar-collapsed";

function readPreference() {
  try { return localStorage.getItem(preferenceKey) === "true"; }
  catch { return false; }
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
    try { localStorage.setItem(preferenceKey, String(collapsed)); }
    catch { /* A navegação continua funcionando se o armazenamento estiver indisponível. */ }
  }, [collapsed]);

  useEffect(() => {
    const dialog = mobileDialog.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const sidebarProps = { user, leaving, onSignOut };
  return <div className="min-h-svh bg-background">
    <a href="#main-content" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Ir para o conteúdo</a>

    <aside id="desktop-sidebar" aria-label="Menu lateral" data-collapsed={collapsed} className={`fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-60"}`}>
      <AppSidebar {...sidebarProps} collapsed={collapsed} />
    </aside>

    <div className={`min-w-0 transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-60"}`}>
      <header className="app-topbar sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Button className="hidden size-8 lg:inline-flex" variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} aria-expanded={!collapsed} aria-controls="desktop-sidebar" title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>
          <SidebarSimpleIcon aria-hidden="true" />
        </Button>
        <button ref={menuTrigger} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="mobile-sidebar"><ListIcon className="size-[18px]" /></button>
        <div className="h-4 w-px bg-border" aria-hidden="true" />
        <nav aria-label="Localização" className="min-w-0 text-xs">
          <ol className="flex items-center gap-2"><li className="hidden text-muted-foreground sm:block">Workspace</li><li className="hidden sm:block" aria-hidden="true"><CaretRightIcon className="size-3 text-muted-foreground" /></li><li aria-current="page" className="truncate font-medium">{title}</li></ol>
        </nav>
        <div className="ml-auto"><ModeToggle /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">{children}</main>
    </div>

    <dialog
      ref={mobileDialog}
      id="mobile-sidebar"
      aria-label="Menu de navegação"
      className="mobile-drawer border-0 border-r bg-sidebar p-0 text-foreground shadow-xl backdrop:bg-black/30"
      onCancel={() => setMobileOpen(false)}
      onClose={() => { setMobileOpen(false); if (window.matchMedia("(max-width: 1023px)").matches) menuTrigger.current?.focus(); }}
      onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setMobileOpen(false); } }}
    >
      <div className="relative h-full">
        <Button variant="ghost" size="icon" className="absolute right-3 top-2.5 z-10 size-11" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><XIcon /></Button>
        <AppSidebar {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
      </div>
    </dialog>
  </div>;
}
