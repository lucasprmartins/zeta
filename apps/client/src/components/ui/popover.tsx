import * as Primitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export function PopoverContent({
  className,
  container,
  align = "start",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Primitive.Content> & {
  container?: HTMLElement | null;
}) {
  return (
    <Primitive.Portal container={container ?? undefined}>
      <Primitive.Content
        align={align}
        className={cn(
          "z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-1 text-card-foreground shadow-md outline-none",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </Primitive.Portal>
  );
}
