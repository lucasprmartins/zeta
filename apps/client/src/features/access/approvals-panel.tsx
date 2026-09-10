import { CheckIcon } from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { useUserId } from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { actionErrorMessage, byId, useInfiniteList } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { accessKeys, approvalsQuery } from "./queries";

export function ApprovalsPanel() {
  const userId = useUserId();
  const client = useQueryClient();
  const users = useInfiniteQuery(approvalsQuery(userId));
  const approve = useMutation({
    mutationFn: (id: string) => rpc.access.approveUser({ id }),
    onSuccess: async () => {
      toast.success("Cadastro aprovado. O usuário já pode entrar.");
      await client.invalidateQueries({ queryKey: accessKeys.all(userId) });
    },
    onError: (error) => toast.error(actionErrorMessage(error)),
  });
  const { items, loadMore } = useInfiniteList(users, byId);
  return (
    <section aria-label="Aprovação de cadastros" className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Revise as contas abaixo antes de liberar o acesso à aplicação.
      </p>
      {users.isRefetchError && users.data && (
        <ErrorNotice
          message="Não foi possível atualizar as pendências."
          retry={() => void users.refetch()}
        />
      )}
      {users.isPending ? (
        <Loading />
      ) : users.isError && !users.data ? (
        <ErrorNotice
          message="Não foi possível carregar as pendências."
          retry={() => void users.refetch()}
        />
      ) : items.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {items.map((user) => (
              <li
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                key={user.id}
              >
                <div className="min-w-0">
                  <p className="break-words font-medium text-sm">{user.name}</p>
                  {user.username && (
                    <p className="mt-1 break-all text-muted-foreground text-sm">
                      @{user.username}
                    </p>
                  )}
                  <p className="mt-1 break-all text-muted-foreground text-sm">
                    {user.email}
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(user.id)}
                  variant="outline"
                >
                  <CheckIcon size={18} />
                  {approve.isPending && approve.variables === user.id
                    ? "Aprovando…"
                    : "Aprovar"}
                  <span className="sr-only"> {user.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Empty>
          <EmptyTitle>Nenhum cadastro pendente</EmptyTitle>
          <EmptyDescription>
            Novas solicitações de aprovação aparecerão aqui.
          </EmptyDescription>
        </Empty>
      )}
      {(users.hasNextPage || users.isFetchNextPageError) && (
        <InfiniteScroll onLoadMore={loadMore} query={users} />
      )}
    </section>
  );
}
