import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

export type Task = Awaited<ReturnType<typeof rpc.tasks.create>>;
export type TaskFilter = "all" | Task["status"];
export const taskKeys = { all: (userId: string) => ["tasks", userId] as const };
export const tasksQuery = (userId: string, filter: TaskFilter, page: number) =>
  queryOptions({
    queryKey: [...taskKeys.all(userId), "page", filter, page],
    queryFn: ({ signal }) =>
      rpc.tasks.list(
        { page, ...(filter === "all" ? {} : { status: filter }) },
        { signal }
      ),
  });

// Chave distinta: uma consulta comum e uma infinita têm formatos de cache diferentes.
export const infiniteTasksQuery = (userId: string, filter: TaskFilter) =>
  infiniteQueryOptions({
    queryKey: [...taskKeys.all(userId), "infinite", filter],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      rpc.tasks.list(
        { page: pageParam, ...(filter === "all" ? {} : { status: filter }) },
        { signal }
      ),
    getNextPageParam: (lastPage) =>
      lastPage.items.length > 0 &&
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
  });
