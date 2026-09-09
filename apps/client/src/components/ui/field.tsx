// Adaptado do shadcn/ui (MIT); estilos alinhados aos tokens locais.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm font-medium leading-relaxed", className)} {...props} />;
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />;
}

