import { ArrowsHorizontalIcon, XIcon } from "@phosphor-icons/react";
import {
  type CSSProperties,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { dismissOnBackdrop, useModalDialog } from "./use-modal-dialog";

const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 360;
const MAX_WIDTH = 960;

const clamp = (value: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

// Sheet do shadcn/ui sobre o dialog nativo. Não há prop `open`: montar abre e
// desmontar fecha; a rota consumidora guarda esse estado na URL.
export function SidePanel({
  title,
  description,
  children,
  footer,
  onClose,
  pending = false,
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  pending?: boolean;
  title: string;
}) {
  const ref = useModalDialog();
  const id = useId();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const actualWidth = clamp(width);

  return (
    <dialog
      aria-describedby={description ? `${id}-description` : undefined}
      aria-labelledby={`${id}-title`}
      className="side-panel border-l bg-background p-0 text-foreground shadow-xl backdrop:bg-black/35"
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
        className="absolute inset-y-0 left-0 z-10 hidden w-3 cursor-col-resize touch-none items-center justify-center hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary sm:flex"
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
      <div className="flex h-full min-w-0 flex-col sm:pl-3">
        <header className="side-panel-header flex shrink-0 items-start gap-3 border-b px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2
              className="break-words font-semibold text-lg outline-none"
              id={`${id}-title`}
              tabIndex={-1}
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-1.5 text-muted-foreground text-sm"
                id={`${id}-description`}
              >
                {description}
              </p>
            )}
          </div>
          <Button
            aria-label={
              actualWidth === MAX_WIDTH
                ? "Restaurar largura do painel"
                : "Ampliar painel"
            }
            className="hidden size-11 shrink-0 sm:inline-flex"
            onClick={() =>
              setWidth(actualWidth === MAX_WIDTH ? DEFAULT_WIDTH : MAX_WIDTH)
            }
            size="icon"
            variant="ghost"
          >
            <ArrowsHorizontalIcon />
          </Button>
          <Button
            aria-label="Fechar painel"
            className="size-11 shrink-0"
            disabled={pending}
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </header>
        <div
          className="side-panel-body min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-5 [overflow-wrap:anywhere] sm:p-6"
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
