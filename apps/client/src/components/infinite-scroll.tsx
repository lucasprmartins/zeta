import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function InfiniteScroll({
  query,
  onLoadMore,
}: {
  query: {
    hasNextPage: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    isRefetchError: boolean;
  };
  onLoadMore: () => void;
}) {
  const {
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError: error,
    isRefetchError: paused,
  } = query;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !hasNextPage ||
      isFetching ||
      paused ||
      error ||
      !sentinel.current ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "0px 0px 240px 0px" }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, paused, error, onLoadMore]);

  return (
    <div className="flex flex-col items-center gap-3" ref={sentinel}>
      {error && (
        <p className="text-center text-muted-foreground text-sm" role="alert">
          Não foi possível carregar mais itens. Tente novamente.
        </p>
      )}
      {hasNextPage && (
        <Button
          disabled={isFetching || paused}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {isFetchingNextPage ? (
            <>
              <SpinnerGapIcon aria-hidden="true" className="animate-spin" />
              Carregando…
            </>
          ) : error ? (
            "Tentar novamente"
          ) : (
            "Carregar mais"
          )}
        </Button>
      )}
      <span className="sr-only" role="status">
        {isFetchingNextPage ? "Carregando mais itens." : ""}
      </span>
    </div>
  );
}
