import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return <div role="status" aria-label="Carregando seu resumo…" className="space-y-6">
    <span className="sr-only">Carregando seu resumo…</span>
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((index) => <Card key={index} className="space-y-5 p-5 shadow-none"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-16" /></Card>)}
    </div>
    <Card aria-hidden="true" className="space-y-4 p-5 shadow-none"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-44" /><Skeleton className="h-1.5 w-full" /></Card>
    <Card aria-hidden="true" className="divide-y shadow-none">
      <div className="space-y-2 p-5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52 max-w-full" /></div>
      {[0, 1, 2].map((index) => <div key={index} className="space-y-2 p-5"><Skeleton className="h-4 w-2/3 max-w-64" /><Skeleton className="h-3 w-1/2 max-w-48" /></div>)}
    </Card>
  </div>;
}
