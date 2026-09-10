// Cor do papel: o mesmo indicador na lista, no agrupamento e na prévia do formulário.
export const DEFAULT_ROLE_COLOR = "#737373";

export function RoleDot({ color }: { color?: string | null | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="size-3 shrink-0 rounded-full border border-foreground/15"
      style={{ backgroundColor: color || DEFAULT_ROLE_COLOR }}
    />
  );
}
