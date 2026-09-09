// Adaptado do shadcn/ui (MIT); estilos alinhados aos tokens locais.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: ComponentProps<"div">) {
  return <div role="alert" data-slot="alert" className={cn("relative w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm leading-relaxed", className)} {...props} />;
}

