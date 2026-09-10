// Controles nativos: sem dependência extra, com o foco e o alvo de toque dos
// demais campos. Use dentro de um <label> que descreva a opção.

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlMark } from "./control";

type MarkProps = Omit<ComponentProps<"input">, "type">;

export function Checkbox({ className, ...props }: MarkProps) {
  return (
    <input
      className={cn(controlMark, "rounded-sm", className)}
      data-slot="checkbox"
      type="checkbox"
      {...props}
    />
  );
}

export function Radio({ className, ...props }: MarkProps) {
  return (
    <input
      className={cn(controlMark, className)}
      data-slot="radio"
      type="radio"
      {...props}
    />
  );
}
