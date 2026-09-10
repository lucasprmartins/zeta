import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./button";

// Montar somente quando aberto. O dialog nativo contém o foco e o devolve ao acionador.
export function Modal({
  title,
  description,
  pending = false,
  onClose,
  children,
  variant = "form",
}: {
  title: string;
  description: string;
  pending?: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "form" | "confirmation";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  // biome-ignore lint/correctness/useExhaustiveDependencies: abrir, focar e restaurar acontece só na montagem.
  useEffect(() => {
    const dialog = ref.current!;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // No celular, abra sem acionar o teclado antes de o usuário escolher um campo.
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    const heading = dialog.querySelector<HTMLElement>("h2");
    heading?.setAttribute("autofocus", "");
    dialog.showModal();
    const initialFocus =
      mobile && variant === "form"
        ? heading
        : (dialog.querySelector<HTMLElement>("[data-modal-autofocus]") ??
          heading);
    initialFocus?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    const fitViewport = () => {
      dialog.style.setProperty(
        "--dialog-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      dialog.style.setProperty("--dialog-top", `${viewport?.offsetTop ?? 0}px`);
    };
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
      dialog.close();
      document.body.style.overflow = overflow;
      // O item acionador pode desaparecer após uma exclusão ou mudança de filtro.
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        document.getElementById("main-content")?.focus();
      }
    };
  }, []);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape é tratado por onCancel do dialog nativo.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: o clique só fecha pelo backdrop.
    <dialog
      aria-describedby={`${id}-description`}
      aria-labelledby={`${id}-title`}
      className="responsive-modal border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/35"
      data-variant={variant}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (!pending && event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            onClose();
          }
        }
      }}
      ref={ref}
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
        </div>
      </div>
    </dialog>
  );
}
