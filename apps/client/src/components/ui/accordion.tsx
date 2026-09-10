// Adaptado do shadcn/ui (MIT), com Phosphor e tokens locais.

import { CaretDownIcon } from "@phosphor-icons/react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Accordion(
  props: ComponentProps<typeof AccordionPrimitive.Root>
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}
export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b last:border-b-0", className)}
      data-slot="accordion-item"
      {...props}
    />
  );
}
export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex min-h-11 flex-1 items-center justify-between gap-3 rounded-md px-4 py-4 text-left font-medium text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        data-slot="accordion-trigger"
        {...props}
      >
        {children}
        <CaretDownIcon
          aria-hidden="true"
          className="size-[18px] shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden text-sm"
      data-slot="accordion-content"
      {...props}
    >
      <div className={cn("px-4 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
