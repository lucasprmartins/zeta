// Adaptado do shadcn/ui (MIT), com variantes locais e foco gerenciado pelo Radix.
import type { ComponentProps } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn("flex items-center gap-1", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return <ToggleGroupPrimitive.Item data-slot="toggle-group-item"
    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground", className)} {...props} />;
}
