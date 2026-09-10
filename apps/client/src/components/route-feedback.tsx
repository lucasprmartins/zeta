import {
  ArrowClockwiseIcon,
  CopyIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { routeErrorMessage } from "@/lib/route-error";

export function RouteFeedback({
  title,
  description,
  detail,
  notFound = false,
  onRetry,
  retrying = false,
}: {
  title: string;
  description: string;
  detail: string;
  notFound?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const Icon = notFound ? MagnifyingGlassIcon : WarningCircleIcon;
  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(detail);
      toast.success("Detalhes copiados para enviar ao suporte.");
    } catch {
      toast.error(
        "Não foi possível copiar. Selecione e copie a mensagem abaixo."
      );
    }
  }
  return (
    <div className="route-feedback flex w-full items-center justify-center px-5 py-8 sm:px-8">
      <Empty className="w-full max-w-xl gap-5 p-0">
        <EmptyMedia>
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <div className="space-y-3" role={notFound ? undefined : "alert"}>
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
            {title}
          </h1>
          <EmptyDescription className="max-w-lg">
            {description}
          </EmptyDescription>
        </div>
        <div className="w-full rounded-lg border bg-card p-4 text-left">
          {!notFound && (
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Detalhes para o suporte
            </p>
          )}
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-error-detail text-xs leading-relaxed [overflow-wrap:anywhere]">
            {detail}
          </pre>
        </div>
        <EmptyContent className="w-full gap-3">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {onRetry && (
              <Button disabled={retrying} onClick={onRetry}>
                <ArrowClockwiseIcon
                  aria-hidden="true"
                  className={retrying ? "animate-spin" : ""}
                />
                {retrying ? "Tentando novamente…" : "Tentar novamente"}
              </Button>
            )}
            <Link
              className={buttonVariants({
                variant: onRetry ? "outline" : "default",
              })}
              to="/"
            >
              <HouseIcon aria-hidden="true" />
              Voltar ao início
            </Link>
          </div>
          {!notFound && (
            <Button
              className="text-muted-foreground"
              onClick={() => void copyDetails()}
              size="sm"
              variant="ghost"
            >
              <CopyIcon aria-hidden="true" />
              Copiar detalhes
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </div>
  );
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrors = useQueryErrorResetBoundary();
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    setRetrying(true);
    queryErrors.reset();
    try {
      await router.invalidate();
      reset();
    } catch {
      toast.error(
        "Não foi possível recuperar a página. Tente novamente em instantes."
      );
    } finally {
      setRetrying(false);
    }
  }
  return (
    <RouteFeedback
      description="Ocorreu um problema inesperado. Tente novamente. Se continuar, envie os detalhes abaixo ao suporte."
      detail={routeErrorMessage(error)}
      onRetry={() => void retry()}
      retrying={retrying}
      title="Não foi possível abrir esta página"
    />
  );
}

export function RouteNotFound() {
  return (
    <RouteFeedback
      description="Este endereço não existe ou a página foi movida. Confira o link ou volte ao início."
      detail="404 — Página não encontrada"
      notFound
      title="Página não encontrada"
    />
  );
}
