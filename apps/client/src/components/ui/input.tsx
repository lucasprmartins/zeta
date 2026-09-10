import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
