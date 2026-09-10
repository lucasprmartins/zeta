import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-xs",
        className
      )}
      data-slot="card"
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6", className)}
      data-slot="card-header"
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-semibold leading-none tracking-tight", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("px-6 pb-6", className)}
      data-slot="card-content"
      {...props}
    />
  );
}
