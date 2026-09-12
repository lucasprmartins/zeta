import {
  ArrowLeftIcon,
  ArrowsHorizontalIcon,
  ArrowsOutIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { dismissOnBackdrop, useModalDialog } from "./use-modal-dialog";

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 360;
const MAX_WIDTH = 960;
const MIN_ROUTE_WIDTH = 480;

const clamp = (value: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

export interface SidePanelProps {
  children: ReactNode;
  footer?: ReactNode;
  label: string;
  onClose: () => void;
  pending?: boolean;
}

// Sheet do shadcn/ui sobre o dialog nativo. Não há prop `open`: montar abre e
// desmontar fecha; a rota consumidora guarda esse estado na URL.
export function SidePanel({
  label,
  children,
  footer,
  onClose,
  pending = false,
}: SidePanelProps) {
  const ref = useModalDialog();
  const id = useId();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const actualWidth = clamp(width);

  useLayoutEffect(() => {
    const dialog = ref.current;
    const route = dialog?.closest<HTMLElement>("[data-panel-route]");
    const header = route
      ?.closest("[data-panel-layout]")
      ?.querySelector<HTMLElement>("[data-panel-header]");
    if (!(dialog && route && header)) {
      return;
    }
    const previousSpace = route.style.getPropertyValue("--route-panel-space");
    const viewport = window.visualViewport;
    const fitRoute = () => {
      const bounds = route.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop ?? 0;
      const top = Math.max(viewportTop, header.getBoundingClientRect().bottom);
      const bottom = viewportTop + (viewport?.height ?? window.innerHeight);
      dialog.style.setProperty("--route-top", `${top}px`);
      dialog.style.setProperty("--route-width", `${bounds.width}px`);
      const alongside =
        !expanded && bounds.width >= MIN_WIDTH + MIN_ROUTE_WIDTH;
      const panelWidth = alongside
        ? Math.min(actualWidth, bounds.width - MIN_ROUTE_WIDTH)
        : actualWidth;
      dialog.style.setProperty("--panel-available-width", `${panelWidth}px`);
      route.style.setProperty(
        "--route-panel-space",
        `${alongside ? panelWidth : 0}px`
      );
      dialog.style.setProperty(
        "--route-height",
        `${Math.max(0, bottom - top)}px`
      );
    };
    const observer = new ResizeObserver(fitRoute);
    observer.observe(route);
    observer.observe(header);
    fitRoute();
    window.addEventListener("resize", fitRoute);
    window.addEventListener("scroll", fitRoute);
    viewport?.addEventListener("resize", fitRoute);
    viewport?.addEventListener("scroll", fitRoute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitRoute);
      window.removeEventListener("scroll", fitRoute);
      viewport?.removeEventListener("resize", fitRoute);
      viewport?.removeEventListener("scroll", fitRoute);
      if (previousSpace) {
        route.style.setProperty("--route-panel-space", previousSpace);
      } else {
        route.style.removeProperty("--route-panel-space");
      }
    };
  }, [actualWidth, expanded, ref]);

  return (
    <dialog
      aria-label={label}
      className="side-panel @container/panel border-l bg-background p-0 text-foreground shadow-xl backdrop:bg-transparent"
      data-expanded={expanded}
      ref={ref}
      style={{ "--panel-width": `${actualWidth}px` } as CSSProperties}
      {...dismissOnBackdrop(onClose, pending)}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: separador ajustável precisa receber foco e eventos de ponteiro. */}
      <div
        aria-controls={`${id}-content`}
        aria-label="Largura do painel"
        aria-orientation="vertical"
        aria-valuemax={MAX_WIDTH}
        aria-valuemin={MIN_WIDTH}
        aria-valuenow={actualWidth}
        aria-valuetext={`${actualWidth} pixels`}
        className={`absolute inset-y-0 left-0 z-10 hidden w-3 cursor-col-resize touch-none items-center justify-center hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary ${expanded ? "" : "sm:flex"}`}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        onKeyDown={(event) => {
          const next = {
            ArrowLeft: actualWidth + 32,
            ArrowRight: actualWidth - 32,
            Home: MIN_WIDTH,
            End: MAX_WIDTH,
          }[event.key];
          if (next !== undefined) {
            event.preventDefault();
            setWidth(clamp(next));
          }
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            width: ref.current?.getBoundingClientRect().width ?? actualWidth,
          };
        }}
        onPointerMove={(event) => {
          if (drag.current) {
            setWidth(
              clamp(
                Math.round(drag.current.width + drag.current.x - event.clientX)
              )
            );
          }
        }}
        onPointerUp={(event) => {
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        role="separator"
        tabIndex={0}
        title="Arraste ou use as setas para ajustar. Duplo clique restaura a largura."
      >
        <span className="h-10 w-1 rounded-full bg-border" />
      </div>
      <div
        className={`flex h-full min-w-0 flex-col ${expanded ? "" : "sm:pl-3"}`}
      >
        <div className="side-panel-header flex shrink-0 px-5 pt-3 pb-1 sm:px-6">
          <div className="side-panel-controls flex w-full items-center gap-1">
            {!expanded && (
              <Button
                aria-label={
                  actualWidth === MAX_WIDTH
                    ? "Restaurar largura do painel"
                    : "Ampliar painel"
                }
                className="hidden size-11 shrink-0 sm:inline-flex"
                onClick={() =>
                  setWidth(
                    actualWidth === MAX_WIDTH ? DEFAULT_WIDTH : MAX_WIDTH
                  )
                }
                size="icon"
                title={
                  actualWidth === MAX_WIDTH
                    ? "Restaurar largura do painel"
                    : "Ampliar painel"
                }
                variant="ghost"
              >
                <ArrowsHorizontalIcon aria-hidden="true" />
              </Button>
            )}
            <Button
              aria-expanded={expanded}
              aria-label={
                expanded ? "Voltar ao painel" : "Expandir na área da página"
              }
              className="hidden size-11 shrink-0 sm:inline-flex"
              onClick={() => setExpanded((value) => !value)}
              size="icon"
              title={
                expanded ? "Voltar ao painel" : "Expandir na área da página"
              }
              variant="ghost"
            >
              {expanded ? (
                <ArrowLeftIcon aria-hidden="true" />
              ) : (
                <ArrowsOutIcon aria-hidden="true" />
              )}
            </Button>
            <Button
              aria-label="Fechar painel"
              className="ml-auto size-11 shrink-0"
              disabled={pending}
              onClick={onClose}
              size="icon"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div
          className="side-panel-body min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-5 [overflow-wrap:anywhere] sm:px-6 sm:pb-6"
          id={`${id}-content`}
        >
          {children}
        </div>
        {footer && (
          <footer className="side-panel-footer shrink-0 border-t p-5 sm:p-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

// O layout das ações é compartilhado; permissões e efeitos ficam na funcionalidade.
export function SidePanelActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 @min-[480px]/panel:[&>a]:w-auto [&>a]:w-full @min-[480px]/panel:[&>button]:w-auto [&>button]:w-full">
      {children}
    </div>
  );
}
