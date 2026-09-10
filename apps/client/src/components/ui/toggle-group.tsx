// Adaptado do shadcn/ui (MIT), com variantes locais e foco gerenciado pelo Radix.

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export function ToggleGroup({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn("flex items-center gap-1", className)}
      data-slot="toggle-group"
      {...props}
    />
  );
}

export function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-muted-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground",
        className
      )}
      data-slot="toggle-group-item"
      {...props}
    />
  );
}
