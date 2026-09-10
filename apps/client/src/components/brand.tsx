import { cn } from "@/lib/utils";

export function BlockMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-9", className)}
      viewBox="0 0 50 50"
    >
      <path
        d="M2 2h10v10H2zM14 2h10v10H14zM26 2h10v10H26zM38 2h10v10H38zM26 14h10v10H26zM14 26h10v10H14zM2 38h10v10H2zM14 38h10v10H14zM26 38h10v10H26zM38 38h10v10H38z"
        fill="currentColor"
      />
    </svg>
  );
}

const sizes = {
  sm: { mark: "size-7", label: "text-xl" },
  default: { mark: "size-8", label: "text-2xl" },
} as const;

export function Brand({
  className,
  labelClassName,
  labelHidden,
  size = "default",
}: {
  className?: string;
  labelClassName?: string;
  labelHidden?: boolean;
  size?: keyof typeof sizes;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-foreground", className)}>
      <BlockMark className={cn(sizes[size].mark, "shrink-0")} />
      <span
        aria-hidden={labelHidden}
        className={cn(
          "font-mono font-semibold tracking-[-0.08em]",
          sizes[size].label,
          labelClassName
        )}
      >
        zeta
      </span>
    </div>
  );
}
