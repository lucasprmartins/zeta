import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, useId } from "react";
import { Button } from "./button";
import { dismissOnBackdrop, useModalDialog } from "./use-modal-dialog";

// Não há prop `open`: montar abre o diálogo e desmontar o fecha.
export function Modal({
  title,
  description,
  pending = false,
  onClose,
  children,
  footer,
  variant = "form",
}: {
  title: string;
  description: string;
  pending?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "form" | "confirmation";
}) {
  const ref = useModalDialog(variant === "confirmation");
  const id = useId();
  return (
    <dialog
      aria-describedby={`${id}-description`}
      aria-labelledby={`${id}-title`}
      className="responsive-modal border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/35"
      data-variant={variant}
      ref={ref}
      {...dismissOnBackdrop(onClose, pending)}
    >
      <div className="modal-layout">
        <div className="modal-header flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              className="break-words font-semibold text-lg tracking-tight outline-none"
              id={`${id}-title`}
              tabIndex={-1}
            >
              {title}
            </h2>
            <p
              className="mt-1.5 text-muted-foreground text-sm"
              id={`${id}-description`}
            >
              {description}
            </p>
          </div>
          <Button
            aria-label="Fechar painel"
            className="-mt-1 -mr-2 size-11"
            disabled={pending}
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
        <div className="modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pt-6">
          {children}
          {footer && (
            <div className="modal-actions [&>button]:w-full sm:[&>button]:w-auto">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
