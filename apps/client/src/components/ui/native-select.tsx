import { CaretDownIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlBase } from "./control";

export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <div
      className="relative w-full has-[select:disabled]:opacity-50"
      data-slot="native-select-wrapper"
    >
      <select
        className={cn(controlBase, "h-11 appearance-none pr-9", className)}
        data-slot="native-select"
        {...props}
      />
      <CaretDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-icon -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
export function NativeSelectOption(props: ComponentProps<"option">) {
  return <option {...props} />;
}
