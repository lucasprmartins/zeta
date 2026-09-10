// Adaptado do shadcn/ui (MIT): variantes CVA; somente botão nativo, sem asChild.

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 sm:min-h-0 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        icon: "size-10 min-w-11 sm:min-w-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      type={type}
      {...props}
    />
  );
}
