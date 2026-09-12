import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { dismissOnBackdrop, useModalDialog } from "./use-modal-dialog";

// Superfície adjacente ao menu; foco, Escape e viewport seguem os diálogos locais.
export function SidebarPanel({
  title,
  collapsed,
  children,
  onClose,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useModalDialog();
  return (
    <dialog
      aria-label={title}
      className="sidebar-panel border-r bg-background p-0 text-foreground shadow-lg backdrop:bg-black/10"
      data-collapsed={collapsed}
      ref={ref}
      {...dismissOnBackdrop(onClose)}
    >
      <div className="flex h-full flex-col">
        <header className="sidebar-panel-header flex shrink-0 items-center justify-between gap-3 border-b">
          <h2 className="font-semibold text-base outline-none" tabIndex={-1}>
            {title}
          </h2>
          <Button
            aria-label="Fechar painel"
            className="size-11"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
