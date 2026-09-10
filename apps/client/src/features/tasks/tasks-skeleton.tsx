import { Skeleton } from "@/components/ui/skeleton";

export function TasksSkeleton() {
  return (
    <div aria-label="Buscando tarefas…" className="divide-y" role="status">
      <span className="sr-only">Buscando tarefas…</span>
      <div
        aria-hidden="true"
        className="hidden border-b bg-sidebar px-6 py-3 sm:block"
      >
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          aria-hidden="true"
          className="flex items-center gap-4 px-5 py-5"
          key={index}
        >
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-64" />
            <Skeleton className="h-3 w-1/2 max-w-48" />
          </div>
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}
