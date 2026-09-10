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
import { usePermissions } from "@/components/permission-boundary";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { permissions } from "@/lib/access";
import { GuideContent } from "./content";
import { guideQuery, guidesQuery } from "./queries";

// Leitores e administradores usam a mesma página; a permissão decide o que aparece além da leitura.
export function GuidesPage({ userId }: { userId: string }) {
  const { can, pending } = usePermissions();
  const admin = can(permissions.access.manage);
  // Só busque depois de conhecer a permissão: a listagem administrativa usa outra chave.
  const query = useInfiniteQuery({
    ...guidesQuery(userId, admin),
    enabled: !pending,
  });
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
      <Link
        className="w-fit py-2 text-muted-foreground text-sm hover:text-foreground"
        to="/help"
      >
        ← Ajuda
      </Link>
      <PageHeader
        description="Encontre orientações para usar as funcionalidades do sistema."
        title="Guia de uso"
      />
      {admin && (
        <Card className="border-primary/40 bg-muted/40">
          <CardHeader>
            <PencilSimpleIcon
              aria-hidden="true"
              className="mb-1 text-muted-foreground"
              size={24}
              weight="regular"
            />
            <CardTitle>Você administra os guias</CardTitle>
            <CardDescription>
              Sua conta cria e edita o conteúdo desta página, com rascunhos
              visíveis apenas para quem administra. Os demais usuários leem os
              guias publicados que o acesso deles permite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className={buttonVariants({ className: "w-full sm:w-auto" })}
              to="/help/guides/new"
            >
              <PlusIcon aria-hidden="true" size={18} />
              Novo guia
            </Link>
          </CardContent>
        </Card>
      )}
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
                  <li className="flex items-center" key={guide.slug}>
                    <Link
                      className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                      params={{ slug: guide.slug }}
                      // Rascunho não tem versão publicada para ler: o item leva direto ao editor.
                      to={
                        guide.published
                          ? "/help/guides/$slug"
                          : "/help/guides/edit/$slug"
                      }
                    >
                      <BookOpenIcon
                        aria-hidden="true"
                        className="shrink-0"
                        size={18}
                      />
                      <span className="min-w-0 flex-1 break-words font-medium">
                        {guide.title}
                      </span>
                      {admin && (
                        <Badge
                          variant={guide.published ? "outline" : "secondary"}
                        >
                          {guide.published ? "Publicado" : "Rascunho"}
                        </Badge>
                      )}
                    </Link>
                    {admin && (
                      <Link
                        aria-label={`Editar ${guide.title}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon",
                          className: "mr-3 shrink-0 text-muted-foreground",
                        })}
                        params={{ slug: guide.slug }}
                        title="Editar guia"
                        to="/help/guides/edit/$slug"
                      >
                        <PencilSimpleIcon aria-hidden="true" size={18} />
                      </Link>
                    )}
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
  const { can } = usePermissions();
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
            actions={
              can(permissions.access.manage) ? (
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  params={{ slug }}
                  to="/help/guides/edit/$slug"
                >
                  <PencilSimpleIcon aria-hidden="true" size={18} />
                  Editar guia
                </Link>
              ) : undefined
            }
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
