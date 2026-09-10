import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive text-sm",
        className
      )}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm leading-relaxed", className)}
      data-slot="alert-description"
      {...props}
    />
  );
}
