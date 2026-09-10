import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  // O container permite abrir o menu dentro de um dialog nativo, que fica na top layer.
  container,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  container?: HTMLElement | null;
}) {
  return (
    <DropdownMenuPrimitive.Portal container={container ?? undefined}>
      <DropdownMenuPrimitive.Content
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-md border bg-card p-1 text-card-foreground shadow-md",
          className
        )}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-11 select-none items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus:bg-sidebar-active focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 lg:min-h-10",
        className
      )}
      data-slot="dropdown-menu-item"
      {...props}
    />
  );
}
