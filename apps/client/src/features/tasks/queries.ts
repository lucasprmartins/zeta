import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

export type Task = Awaited<ReturnType<typeof rpc.tasks.create>>;
export type TaskUser = Task["mentions"][number];
export type TaskFilter = "all" | Task["status"];

// O mesmo limite do domínio; o servidor recusa o que passar disso.
export const MAX_MENTIONS = 20;

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

// O catálogo de contas muda pouco; o termo entra na chave e cada busca fica em cache.
export const mentionableUsersQuery = (userId: string, search: string) =>
  queryOptions({
    queryKey: [...taskKeys.all(userId), "mentionable", search],
    queryFn: ({ signal }) => rpc.tasks.mentionableUsers({ search }, { signal }),
    staleTime: 30_000,
  });
