// Adaptado de shadcn/ui: https://ui.shadcn.com/docs/components/base/message
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Message({
  className,
  align = "start",
  ...props
}: ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      className={cn(
        "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
        className
      )}
      data-align={align}
      data-slot="message"
      {...props}
    />
  );
}

export function MessageAvatar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted",
        className
      )}
      data-slot="message-avatar"
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "wrap-break-word flex w-full min-w-0 flex-col gap-2.5 group-data-[align=end]/message:items-end",
        className
      )}
      data-slot="message-content"
      {...props}
    />
  );
}

export function MessageHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center px-3 font-medium text-muted-foreground text-xs",
        className
      )}
      data-slot="message-header"
      {...props}
    />
  );
}
