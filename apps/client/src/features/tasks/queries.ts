import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

export type Task = Awaited<ReturnType<typeof rpc.tasks.create>>;
export type TaskUser = Task["mentions"][number];
export type TaskFilter = "all" | Task["status"];

// O mesmo limite do domínio; o servidor recusa o que passar disso.
export const MAX_MENTIONS = 20;

export const taskKeys = { all: (userId: string) => ["tasks", userId] as const };
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

export type TaskSummary = Awaited<ReturnType<typeof rpc.tasks.summary>>;

// Agregado pelo servidor: o painel não deduz totais do tamanho da página.
export const taskSummaryQuery = (userId: string) =>
  queryOptions({
    queryKey: [...taskKeys.all(userId), "summary"],
    queryFn: ({ signal }) => rpc.tasks.summary({}, { signal }),
  });
