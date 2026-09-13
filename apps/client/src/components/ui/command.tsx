import { Command as Primitive } from "cmdk";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Command({
  className,
  ...props
}: ComponentProps<typeof Primitive>) {
  return (
    <Primitive
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md",
        className
      )}
      {...props}
    />
  );
}
export function CommandInput({
  className,
  ...props
}: ComponentProps<typeof Primitive.Input>) {
  return (
    <Primitive.Input
      className={cn(
        "h-11 w-full border-b bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
export function CommandList({
  className,
  ...props
}: ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      className={cn(
        "max-h-64 overflow-y-auto overscroll-contain p-1",
        className
      )}
      {...props}
    />
  );
}
export function CommandItem({
  className,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    />
  );
}
export function CommandEmpty(props: ComponentProps<typeof Primitive.Empty>) {
  return (
    <Primitive.Empty
      className="px-3 py-6 text-center text-muted-foreground text-sm"
      {...props}
    />
  );
}
