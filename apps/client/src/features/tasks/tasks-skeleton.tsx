import { Skeleton } from "@/components/ui/skeleton";

// Linhas fixas do esqueleto: identidade estável, sem depender do índice.
const rows = ["first", "second", "third", "fourth", "fifth"];

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
      {rows.map((row) => (
        <div
          aria-hidden="true"
          className="flex items-center gap-4 px-5 py-5"
          key={row}
        >
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-64" />
            <Skeleton className="h-3 w-1/2 max-w-48" />
          </div>
          <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex lg:w-40">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
