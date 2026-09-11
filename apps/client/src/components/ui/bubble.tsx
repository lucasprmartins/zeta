// Adaptado de shadcn/ui. Superfície nativa, sem asChild, conforme a UI local.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const bubbleVariants = cva(
  "group/bubble relative flex w-fit min-w-0 max-w-[85%] flex-col gap-1 group-data-[align=end]/message:self-end",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground",
        muted:
          "*:data-[slot=bubble-content]:bg-muted *:data-[slot=bubble-content]:text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Bubble({
  className,
  variant = "default",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      className={cn(bubbleVariants({ variant }), className)}
      data-slot="bubble"
      data-variant={variant}
      {...props}
    />
  );
}

export function BubbleContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "wrap-break-word w-fit min-w-0 max-w-full overflow-hidden rounded-3xl border border-transparent px-4 py-3 text-sm leading-relaxed",
        className
      )}
      data-slot="bubble-content"
      {...props}
    />
  );
}
