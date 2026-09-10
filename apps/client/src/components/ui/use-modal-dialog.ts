import { useEffect, useRef } from "react";

let openDialogs = 0;
let originalOverflow = "";

// Compartilha viewport, foco e bloqueio de rolagem entre painéis e modais aninhados.
export function useModalDialog(confirmation = false) {
  const ref = useRef<HTMLDialogElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: abrir, focar e restaurar acontece só na montagem.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
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
      mobile && !confirmation
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
    if (openDialogs === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogs += 1;
    return () => {
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
      dialog.close();
      openDialogs -= 1;
      if (openDialogs === 0) {
        document.body.style.overflow = originalOverflow;
      }
      // O item acionador pode desaparecer após uma exclusão ou mudança de filtro.
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        document.getElementById("main-content")?.focus();
      }
    };
  }, []);
  return ref;
}
