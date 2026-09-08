import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "./ui/button";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
    <SpinnerGapIcon className="size-5 animate-spin" aria-hidden="true" />{label}
  </div>;
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
    <p>{message}</p>
    {retry && <Button variant="outline" size="sm" className="mt-3" onClick={retry}>Tentar novamente</Button>}
  </div>;
}
