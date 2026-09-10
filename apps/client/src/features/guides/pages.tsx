import { useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon, PlusIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Loading, ErrorNotice } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { GuideContent } from "./content";
import { guideQuery, guidesQuery } from "./queries";

export function GuidesPage({ userId, admin = false }: { userId: string; admin?: boolean }) {
  const query = useInfiniteQuery(guidesQuery(userId, admin));
  const { hasNextPage, isFetching, fetchNextPage } = query;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetching) void fetchNextPage({ cancelRefetch: false }); }, [hasNextPage, isFetching, fetchNextPage]);
  const items = [...new Map(query.data?.pages.flatMap((page) => page.items).map((item) => [item.slug, item]) ?? []).values()];
  const groups = Map.groupBy(items, (item) => item.section);
  return <PageContent>{!admin && <Link to="/help" className="w-fit py-2 text-sm text-muted-foreground hover:text-foreground">← Ajuda</Link>}<PageHeader title="Guia de uso" description={admin ? "Crie, revise e publique orientações para os usuários." : "Encontre orientações para usar as funcionalidades do sistema."} actions={admin ? <Link to="/admin/guides/new" className={buttonVariants()}><PlusIcon size={18} />Novo guia</Link> : undefined} />
    {query.isRefetchError && query.data && <ErrorNotice message="Não foi possível atualizar os guias." retry={() => void query.refetch()} />}
    {query.isPending ? <Loading /> : query.isError && !query.data ? <ErrorNotice message="Não foi possível carregar os guias." retry={() => void query.refetch()} /> : !items.length ? <Empty><EmptyTitle>{admin ? "Nenhum guia cadastrado" : "Nenhum guia disponível"}</EmptyTitle><EmptyDescription>{admin ? "Crie um guia ou importe arquivos Markdown pelo comando guides:import." : "Os guias publicados para seu acesso aparecerão aqui."}</EmptyDescription></Empty> : [...groups].map(([section, guides]) => <section key={section} className="space-y-3"><h2 className="text-sm font-medium text-muted-foreground">{section}</h2><Card className="overflow-hidden"><ul className="divide-y">{guides.map((guide) => <li key={guide.slug}><Link to={admin ? "/admin/guides/edit/$slug" : "/help/guides/$slug"} params={{ slug: guide.slug }} className="flex min-h-16 items-center gap-3 p-5 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
      <BookOpenIcon size={18} className="shrink-0" /><span className="min-w-0 flex-1 break-words font-medium">{guide.title}</span>{admin && <><span className="text-xs text-muted-foreground">{guide.published ? "Publicado" : "Rascunho"}</span><PencilSimpleIcon size={18} className="shrink-0" /></>}
    </Link></li>)}</ul></Card></section>)}
    {(query.hasNextPage || query.isFetchNextPageError) && <InfiniteScroll hasNextPage={query.hasNextPage} isFetching={query.isFetching} isFetchingNextPage={query.isFetchingNextPage} error={query.isFetchNextPageError} paused={query.isRefetchError} onLoadMore={loadMore} />}
  </PageContent>;
}
export function GuideReadPage({ userId, slug }: { userId: string; slug: string }) {
  const query = useQuery(guideQuery(userId, slug));
  return <PageContent><Link to="/help/guides" className="w-fit py-2 text-sm text-muted-foreground hover:text-foreground">← Guia de uso</Link>
    {query.isPending ? <Loading /> : query.isError ? <ErrorNotice message="Este guia não está disponível para seu acesso ou não pôde ser carregado." retry={() => void query.refetch()} /> : <><PageHeader title={query.data.title} description={query.data.section} /><article className="w-full max-w-3xl"><GuideContent markdown={query.data.markdown} /></article></>}
  </PageContent>;
}
