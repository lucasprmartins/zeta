import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

export function isUnauthorized(error: unknown) {
  return error instanceof Error && "status" in error && error.status === 401;
}

export function isForbidden(error: unknown) {
  return error instanceof Error && "status" in error && error.status === 403;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error, query) => { if (isForbidden(error) && query.queryKey[0] !== "permissions") void queryClient.invalidateQueries({ queryKey: ["permissions"] }); } }),
  mutationCache: new MutationCache({ onError: (error) => { if (isForbidden(error)) void queryClient.invalidateQueries({ queryKey: ["permissions"] }); } }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (count, error) => !isUnauthorized(error) && !isForbidden(error) && count < 1 },
    mutations: { retry: false },
  },
});
