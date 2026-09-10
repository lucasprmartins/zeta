// Adaptado do shadcn/ui (MIT): mesma API de `config` e `--color-<chave>`, sem o
// suporte a temas por objeto nem a legenda — o projeto usa tokens e rótulos diretos.

import type { ComponentProps, ReactNode } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  config: ChartConfig;
  // O ResponsiveContainer aceita um único filho.
  children: ComponentProps<typeof ResponsiveContainer>["children"];
}) {
  return (
    <div
      className={cn(
        "w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-surface]:outline-none",
        className
      )}
      data-slot="chart"
      style={Object.fromEntries(
        Object.entries(config).map(([key, item]) => [
          `--color-${key}`,
          item.color,
        ])
      )}
      {...props}
    >
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

export const ChartTooltip = Tooltip;

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  total,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ReactNode;
  config: ChartConfig;
  // Quando informado, cada linha ganha a fatia que representa do conjunto.
  total?: number;
}) {
  if (!(active && payload?.length)) {
    return null;
  }
  return (
    <div className="min-w-36 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1.5 font-medium">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const item = config[key];
          const value = Number(entry.value ?? 0);
          return (
            <li className="flex items-center gap-2" key={key}>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: item?.color ?? entry.color }}
              />
              <span className="flex-1 text-muted-foreground">
                {item?.label ?? key}
              </span>
              <span className="font-medium tabular-nums">
                {value}
                {total ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({Math.round((value / total) * 100)}%)
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Identidade nunca sai só da cor: a legenda acompanha todo gráfico com duas séries.
export function ChartLegend({ config }: { config: ChartConfig }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {Object.entries(config).map(([key, item]) => (
        <li className="flex items-center gap-1.5 text-xs" key={key}>
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
