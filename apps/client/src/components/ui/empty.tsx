// Adaptado do shadcn/ui (MIT); estilos alinhados aos tokens locais.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="empty" className={cn("flex flex-col items-center justify-center gap-4 px-6 py-12 text-center", className)} {...props} />;
}

export function EmptyMedia({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="empty-media" className={cn("flex size-12 items-center justify-center rounded-xl border bg-sidebar text-muted-foreground [&_svg]:size-6", className)} {...props} />;
}

export function EmptyTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 data-slot="empty-title" className={cn("text-sm font-medium", className)} {...props} />;
}

export function EmptyDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="empty-description" className={cn("max-w-sm text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

export function EmptyContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="empty-content" className={cn("flex flex-col items-center gap-2", className)} {...props} />;
}

