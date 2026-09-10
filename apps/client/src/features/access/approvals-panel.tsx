import { useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { rpc } from "@/lib/rpc";
import { accessError, accessKeys, approvalsQuery } from "./queries";

export function ApprovalsPanel({ userId }: { userId: string }) {
  const client = useQueryClient();
  const users = useInfiniteQuery(approvalsQuery(userId));
  const approve = useMutation({ mutationFn: (id: string) => rpc.access.approveUser({ id }), onSuccess: async () => {
    toast.success("Cadastro aprovado. O usuário já pode entrar.");
    await client.invalidateQueries({ queryKey: accessKeys.all(userId) });
  }, onError: (error) => toast.error(accessError(error)) });
  const { hasNextPage, isFetching, fetchNextPage } = users;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetching) void fetchNextPage({ cancelRefetch: false }); }, [hasNextPage, isFetching, fetchNextPage]);
  const items = [...new Map(users.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) ?? []).values()];
  return <section aria-label="Aprovação de cadastros" className="space-y-6">
    <p className="text-sm text-muted-foreground">Revise as contas abaixo antes de liberar o acesso à aplicação.</p>
    {users.isRefetchError && users.data && <ErrorNotice message="Não foi possível atualizar as pendências." retry={() => void users.refetch()} />}
    {users.isPending ? <Loading /> : users.isError && !users.data ? <ErrorNotice message="Não foi possível carregar as pendências." retry={() => void users.refetch()} /> : !items.length ? <Empty><EmptyTitle>Nenhum cadastro pendente</EmptyTitle><EmptyDescription>Novas solicitações de aprovação aparecerão aqui.</EmptyDescription></Empty> : <Card className="overflow-hidden"><ul className="divide-y">{items.map((user) => <li key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="break-words text-sm font-medium">{user.name}</p>{user.username && <p className="mt-1 break-all text-sm text-muted-foreground">@{user.username}</p>}<p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p></div>
      <Button variant="outline" className="shrink-0" disabled={approve.isPending} onClick={() => approve.mutate(user.id)}><CheckIcon size={18} />{approve.isPending && approve.variables === user.id ? "Aprovando…" : "Aprovar"}<span className="sr-only"> {user.name}</span></Button>
    </li>)}</ul></Card>}
    {(users.hasNextPage || users.isFetchNextPageError) && <InfiniteScroll hasNextPage={users.hasNextPage} isFetching={users.isFetching} isFetchingNextPage={users.isFetchingNextPage} error={users.isFetchNextPageError} paused={users.isRefetchError} onLoadMore={loadMore} />}
  </section>;
}
