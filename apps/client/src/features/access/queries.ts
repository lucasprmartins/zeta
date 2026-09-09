import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
export type AccessRole = Awaited<ReturnType<typeof rpc.access.roles>>["roles"][number];
export type AccessUser = Awaited<ReturnType<typeof rpc.access.users>>["items"][number];
export const accessKeys = { all: (userId: string) => ["access", userId] as const };
export const rolesQuery = (userId: string) => queryOptions({ queryKey: [...accessKeys.all(userId), "roles"], queryFn: ({ signal }) => rpc.access.roles(undefined, { signal }) });
export const usersQuery = (userId: string, search: string) => infiniteQueryOptions({
  queryKey: [...accessKeys.all(userId), "users", "infinite", search], initialPageParam: 1,
  queryFn: ({ pageParam, signal }) => rpc.access.users({ page: pageParam, search }, { signal }),
  getNextPageParam: (page, _, previous) => page.hasMore ? previous + 1 : undefined,
});
export function accessError(error: unknown) {
  return error instanceof Error && "status" in error && [400, 403, 404, 409].includes(Number(error.status)) ? error.message : "Não foi possível salvar. Tente novamente.";
}
