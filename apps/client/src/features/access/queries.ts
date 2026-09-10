import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { nextPageIfMore } from "@/lib/query";
import { rpc } from "@/lib/rpc";
export type AccessRole = Awaited<
  ReturnType<typeof rpc.access.roles>
>["roles"][number];
export type AccessUser = Awaited<
  ReturnType<typeof rpc.access.users>
>["items"][number];
export const accessKeys = {
  all: (userId: string) => ["access", userId] as const,
};
export const rolesQuery = (userId: string) =>
  queryOptions({
    queryKey: [...accessKeys.all(userId), "roles"],
    queryFn: ({ signal }) => rpc.access.roles(undefined, { signal }),
  });
export const usersQuery = (userId: string, search: string) =>
  infiniteQueryOptions({
    queryKey: [...accessKeys.all(userId), "users", "infinite", search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      rpc.access.users({ page: pageParam, search }, { signal }),
    getNextPageParam: nextPageIfMore,
  });
// Consultada pela tela de acesso, inclusive sem sessão: sem sondagem contínua.
// O servidor reavalia a política no próprio cadastro.
export const registrationPolicyQuery = queryOptions({
  queryKey: ["registration-policy"],
  queryFn: ({ signal }) => rpc.access.registrationPolicy(undefined, { signal }),
});
export const registrationStatusQuery = (userId: string) =>
  queryOptions({
    queryKey: [...accessKeys.all(userId), "registration"],
    queryFn: ({ signal }) =>
      rpc.access.registrationStatus(undefined, { signal }),
    refetchInterval: 15_000,
  });
export const approvalsQuery = (userId: string) =>
  infiniteQueryOptions({
    queryKey: [...accessKeys.all(userId), "approvals", "infinite"],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      rpc.access.pendingUsers({ page: pageParam }, { signal }),
    getNextPageParam: nextPageIfMore,
  });
