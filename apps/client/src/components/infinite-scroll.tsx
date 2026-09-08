import { useEffect, useRef } from "react";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// A feature controla o Query; este componente cuida só do gatilho e da interação.
export function InfiniteScroll({ hasNextPage, isFetching, isFetchingNextPage, error = false, paused = false, onLoadMore }: {
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  error?: boolean;
  paused?: boolean;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage || isFetching || paused || error || !sentinel.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onLoadMore();
    }, { rootMargin: "0px 0px 240px 0px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, paused, error, onLoadMore]);

  return <div ref={sentinel} className="flex flex-col items-center gap-3">
    {error && <p role="alert" className="text-center text-sm text-muted-foreground">Não foi possível carregar mais itens. Tente novamente.</p>}
    {hasNextPage && <Button variant="outline" size="sm" disabled={isFetching || paused} onClick={onLoadMore}>
      {isFetchingNextPage ? <><SpinnerGapIcon className="animate-spin" aria-hidden="true" />Carregando…</> : error ? "Tentar novamente" : "Carregar mais"}
    </Button>}
    <span role="status" className="sr-only">{isFetchingNextPage ? "Carregando mais itens." : ""}</span>
  </div>;
}
