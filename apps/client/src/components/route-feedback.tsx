import { useState } from "react";
import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ArrowClockwiseIcon, CopyIcon, HouseIcon, WarningCircleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { routeErrorMessage } from "@/lib/route-error";

export function RouteFeedback({ title, description, detail, notFound = false, onRetry, retrying = false }: {
  title: string; description: string; detail: string; notFound?: boolean;
  onRetry?: () => void; retrying?: boolean;
}) {
  const Icon = notFound ? MagnifyingGlassIcon : WarningCircleIcon;
  async function copyDetails() {
    try { await navigator.clipboard.writeText(detail); toast.success("Detalhes copiados para enviar ao suporte."); }
    catch { toast.error("Não foi possível copiar. Selecione e copie a mensagem abaixo."); }
  }
  return <div className="route-feedback flex w-full items-center justify-center px-5 py-8 sm:px-8">
    <Empty className="w-full max-w-xl gap-5 p-0">
      <EmptyMedia><Icon aria-hidden="true" /></EmptyMedia>
      <div className="space-y-3" role={notFound ? undefined : "alert"}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <EmptyDescription className="max-w-lg">{description}</EmptyDescription>
      </div>
      <div className="w-full rounded-lg border bg-card p-4 text-left">
        {!notFound && <p className="mb-2 text-xs font-medium text-muted-foreground">Detalhes para o suporte</p>}
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-error-detail [overflow-wrap:anywhere]">{detail}</pre>
      </div>
      <EmptyContent className="w-full gap-3">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {onRetry && <Button onClick={onRetry} disabled={retrying}><ArrowClockwiseIcon aria-hidden="true" className={retrying ? "animate-spin" : ""} />{retrying ? "Tentando novamente…" : "Tentar novamente"}</Button>}
          <Link to="/" className={buttonVariants({ variant: onRetry ? "outline" : "default" })}><HouseIcon aria-hidden="true" />Voltar ao início</Link>
        </div>
        {!notFound && <Button variant="ghost" size="sm" onClick={() => void copyDetails()} className="text-muted-foreground"><CopyIcon aria-hidden="true" />Copiar detalhes</Button>}
      </EmptyContent>
    </Empty>
  </div>;
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrors = useQueryErrorResetBoundary();
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    setRetrying(true);
    queryErrors.reset();
    try { await router.invalidate(); reset(); }
    catch { toast.error("Não foi possível recuperar a página. Tente novamente em instantes."); }
    finally { setRetrying(false); }
  }
  return <RouteFeedback title="Não foi possível abrir esta página" description="Ocorreu um problema inesperado. Tente novamente. Se continuar, envie os detalhes abaixo ao suporte."
    detail={routeErrorMessage(error)} onRetry={() => void retry()} retrying={retrying} />;
}

export function RouteNotFound() {
  return <RouteFeedback notFound title="Página não encontrada" description="Este endereço não existe ou a página foi movida. Confira o link ou volte ao início."
    detail="404 — Página não encontrada" />;
}
