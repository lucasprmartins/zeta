import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { taskColumnClassNames } from "./task-columns";

const rows = ["first", "second", "third", "fourth", "fifth"];
const columns = Object.entries(taskColumnClassNames);

export function TasksSkeleton() {
  return (
    <div
      aria-label="Buscando tarefas…"
      className="overflow-hidden rounded-lg border"
      role="status"
    >
      <span className="sr-only">Buscando tarefas…</span>
      <Table aria-hidden="true" className="table-fixed">
        <TableHeader>
          <TableRow>
            {columns.map(([id, className]) => (
              <TableHead className={className} key={id}>
                <Skeleton className="h-3 w-3/4" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row}>
              {columns.map(([id, className]) => (
                <TableCell className={className} key={id}>
                  <Skeleton
                    className={
                      id === "completion" ? "mx-auto size-4" : "my-3 h-4 w-3/4"
                    }
                  />
                  {id === "title" && (
                    <div className="flex @min-[960px]/tasks:hidden flex-wrap items-center gap-3 pb-1">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
