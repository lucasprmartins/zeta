import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground text-sm"
      role="status"
    >
      <SpinnerGapIcon aria-hidden="true" className="size-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
      {retry && (
        <Button className="mt-3" onClick={retry} size="sm" variant="outline">
          Tentar novamente
        </Button>
      )}
    </Alert>
  );
}
