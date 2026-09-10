import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const cards = ["total", "pending", "completed", "progress"];
const bars = ["first", "second", "third", "fourth"];

export function DashboardSkeleton() {
  return (
    <div aria-label="Carregando o resumo…" className="space-y-6" role="status">
      <span className="sr-only">Carregando o resumo…</span>
      <div
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <Card className="space-y-5 p-5 shadow-none" key={card}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-16" />
          </Card>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 p-5 shadow-none">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto aspect-square w-full max-w-56 rounded-full" />
          <Skeleton className="mx-auto h-3 w-36" />
        </Card>
        <Card className="space-y-4 p-5 shadow-none lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <div className="space-y-3 pt-2">
            {bars.map((bar, index) => (
              <Skeleton
                className="h-[18px]"
                key={bar}
                style={{ width: `${90 - index * 18}%` }}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
