import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export function hasStatus(error: unknown, ...codes: number[]) {
  return (
    error instanceof Error &&
    "status" in error &&
    codes.includes(Number(error.status))
  );
}

export const isUnauthorized = (error: unknown) => hasStatus(error, 401);
export const isForbidden = (error: unknown) => hasStatus(error, 403);

export const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente.";

// 400/403/404/409 trazem do servidor uma mensagem própria para exibição; os
// demais casos usam o texto da tela, sem expor detalhes técnicos.
export function actionErrorMessage(
  error: unknown,
  fallback = "Não foi possível salvar. Tente novamente."
): string {
  if (isUnauthorized(error)) {
    return SESSION_EXPIRED;
  }
  return hasStatus(error, 400, 403, 404, 409) && error instanceof Error
    ? error.message
    : fallback;
}

// Todas as listagens paginadas da API respondem `hasMore`.
export const nextPageIfMore = (
  page: { hasMore: boolean },
  _pages: unknown,
  previous: number
) => (page.hasMore ? previous + 1 : undefined);

// Acessores estáveis: entram na dependência do memo das listagens.
export const byId = (item: { id: string }) => item.id;
export const bySlug = (item: { slug: string }) => item.slug;

type InfiniteListQuery<TItem> = {
  data?: { pages: readonly { items: TItem[] }[] } | undefined;
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage(options?: { cancelRefetch?: boolean }): Promise<unknown>;
};

// A paginação por offset pode repetir IDs entre páginas sob escrita concorrente.
export function useInfiniteList<TItem>(
  query: InfiniteListQuery<TItem>,
  keyOf: (item: TItem) => string
) {
  const { data, hasNextPage, isFetching, fetchNextPage } = query;
  const pages = data?.pages;
  const items = useMemo(
    () =>
      pages
        ? [
            ...new Map(
              pages
                .flatMap((page) => page.items)
                .map((item) => [keyOf(item), item])
            ).values(),
          ]
        : [],
    [pages, keyOf]
  );
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetching, fetchNextPage]);
  return { items, loadMore };
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isForbidden(error) && query.queryKey[0] !== "permissions") {
        void queryClient.invalidateQueries({ queryKey: ["permissions"] });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isForbidden(error)) {
        void queryClient.invalidateQueries({ queryKey: ["permissions"] });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        !(isUnauthorized(error) || isForbidden(error)) && count < 1,
    },
    mutations: { retry: false },
  },
});
