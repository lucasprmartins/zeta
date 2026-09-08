import { QueryClient } from "@tanstack/react-query";

export function isUnauthorized(error: unknown) {
  return error instanceof Error && "status" in error && error.status === 401;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (count, error) => !isUnauthorized(error) && count < 1 },
    mutations: { retry: false },
  },
});
