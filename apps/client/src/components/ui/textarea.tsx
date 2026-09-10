import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "./control";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        controlBase,
        "flex min-h-24 resize-y disabled:opacity-50",
        className
      )}
      data-slot="textarea"
      {...props}
    />
  );
}
