import { Alert, AlertDescription } from "./ui/alert";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "./ui/button";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
    <SpinnerGapIcon className="size-5 animate-spin" aria-hidden="true" />{label}
  </div>;
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <Alert>
    <AlertDescription>{message}</AlertDescription>
    {retry && <Button variant="outline" size="sm" className="mt-3" onClick={retry}>Tentar novamente</Button>}
  </Alert>;
}
