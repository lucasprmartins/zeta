// Adaptado do shadcn/ui (MIT), com Phosphor e alvos de toque locais.
import type { ComponentProps } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <div className="relative w-full has-[select:disabled]:opacity-50" data-slot="native-select-wrapper">
    <select data-slot="native-select" className={cn("h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-background px-3 pr-9 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed sm:text-sm", className)} {...props} />
    <CaretDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
  </div>;
}
export function NativeSelectOption(props: ComponentProps<"option">) { return <option {...props} />; }
