// Adaptado do shadcn/ui (MIT); estilos alinhados aos tokens locais.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className
      )}
      data-slot="empty"
      {...props}
    />
  );
}

export function EmptyMedia({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center rounded-xl border bg-sidebar text-muted-foreground [&_svg]:size-6",
        className
      )}
      data-slot="empty-media"
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-medium text-sm", className)}
      data-slot="empty-title"
      {...props}
    />
  );
}

export function EmptyDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "max-w-sm text-muted-foreground text-sm leading-relaxed",
        className
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

export function EmptyContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      data-slot="empty-content"
      {...props}
    />
  );
}
