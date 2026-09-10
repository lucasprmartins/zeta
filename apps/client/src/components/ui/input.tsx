import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "./control";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(controlBase, "flex h-11 disabled:opacity-50", className)}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
