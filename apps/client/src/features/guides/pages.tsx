import {
  BookOpenIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { GuideContent } from "./content";
import { guideQuery, guidesQuery } from "./queries";

export function GuidesPage({
  userId,
  admin = false,
}: {
  userId: string;
  admin?: boolean;
}) {
  const query = useInfiniteQuery(guidesQuery(userId, admin));
  const { hasNextPage, isFetching, fetchNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetching, fetchNextPage]);
  const items = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.items)
        .map((item) => [item.slug, item]) ?? []
    ).values(),
  ];
  const groups = Map.groupBy(items, (item) => item.section);
  return (
    <PageContent>
      {!admin && (
        <Link
          className="w-fit py-2 text-muted-foreground text-sm hover:text-foreground"
          to="/help"
        >
          ← Ajuda
        </Link>
      )}
      <PageHeader
        actions={
          admin ? (
            <Link className={buttonVariants()} to="/admin/guides/new">
              <PlusIcon size={18} />
              Novo guia
            </Link>
          ) : undefined
        }
        description={
          admin
            ? "Crie, revise e publique orientações para os usuários."
            : "Encontre orientações para usar as funcionalidades do sistema."
        }
        title="Guia de uso"
      />
      {query.isRefetchError && query.data && (
        <ErrorNotice
          message="Não foi possível atualizar os guias."
          retry={() => void query.refetch()}
        />
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError && !query.data ? (
        <ErrorNotice
          message="Não foi possível carregar os guias."
          retry={() => void query.refetch()}
        />
      ) : items.length ? (
        [...groups].map(([section, guides]) => (
          <section className="space-y-3" key={section}>
            <h2 className="font-medium text-muted-foreground text-sm">
              {section}
            </h2>
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      className="flex min-h-16 items-center gap-3 p-5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                      params={{ slug: guide.slug }}
                      to={
                        admin
                          ? "/admin/guides/edit/$slug"
                          : "/help/guides/$slug"
                      }
                    >
                      <BookOpenIcon className="shrink-0" size={18} />
                      <span className="min-w-0 flex-1 break-words font-medium">
                        {guide.title}
                      </span>
                      {admin && (
                        <>
                          <span className="text-muted-foreground text-xs">
                            {guide.published ? "Publicado" : "Rascunho"}
                          </span>
                          <PencilSimpleIcon className="shrink-0" size={18} />
                        </>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      ) : (
        <Empty>
          <EmptyTitle>
            {admin ? "Nenhum guia cadastrado" : "Nenhum guia disponível"}
          </EmptyTitle>
          <EmptyDescription>
            {admin
              ? "Crie um guia ou importe arquivos Markdown pelo comando guides:import."
              : "Os guias publicados para seu acesso aparecerão aqui."}
          </EmptyDescription>
        </Empty>
      )}
      {(query.hasNextPage || query.isFetchNextPageError) && (
        <InfiniteScroll
          error={query.isFetchNextPageError}
          hasNextPage={query.hasNextPage}
          isFetching={query.isFetching}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={loadMore}
          paused={query.isRefetchError}
        />
      )}
    </PageContent>
  );
}
export function GuideReadPage({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}) {
  const query = useQuery(guideQuery(userId, slug));
  return (
    <PageContent>
      <Link
        className="w-fit py-2 text-muted-foreground text-sm hover:text-foreground"
        to="/help/guides"
      >
        ← Guia de uso
      </Link>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorNotice
          message="Este guia não está disponível para seu acesso ou não pôde ser carregado."
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <PageHeader
            description={query.data.section}
            title={query.data.title}
          />
          <article className="w-full max-w-3xl">
            <GuideContent markdown={query.data.markdown} />
          </article>
        </>
      )}
    </PageContent>
  );
}
