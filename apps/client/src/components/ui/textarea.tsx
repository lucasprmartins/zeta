// Adaptado do shadcn/ui (MIT); estilos alinhados aos tokens locais.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("flex min-h-24 w-full min-w-0 resize-y rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm", className)} {...props} />;
}

