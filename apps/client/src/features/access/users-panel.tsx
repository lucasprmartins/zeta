import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { Loading, ErrorNotice } from "@/components/feedback";
import { rpc } from "@/lib/rpc";
import { accessError, accessKeys, rolesQuery, usersQuery, type AccessUser } from "./queries";

export function UsersPanel({ userId, search, onSearch }: { userId: string; search: string; onSearch: (search: string) => void }) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const [roleId, setRoleId] = useState("");
  const client = useQueryClient();
  const roles = useQuery(rolesQuery(userId));
  const users = useInfiniteQuery(usersQuery(userId, search));
  const assign = useMutation({ mutationFn: (input: { userId: string; roleId: string }) => rpc.access.assignRole(input), onSuccess: async () => {
    setEditing(null); toast.success("Papel atualizado.");
    await Promise.all([client.invalidateQueries({ queryKey: accessKeys.all(userId) }), client.invalidateQueries({ queryKey: ["permissions"] })]);
  }, onError: (error) => toast.error(accessError(error)) });
  const items = [...new Map(users.data?.pages.flatMap((page) => page.items).map((user) => [user.id, user]) ?? []).values()];
  const groups = Map.groupBy(items, (user) => user.role);
  const { hasNextPage, isFetching, fetchNextPage } = users;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetching) void fetchNextPage({ cancelRefetch: false }); }, [hasNextPage, isFetching, fetchNextPage]);
  return <section aria-label="Usuários" className="space-y-6">
    <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}><Field className="min-w-0 flex-1"><FieldLabel htmlFor="users-search">Buscar por nome ou e-mail</FieldLabel><Input id="users-search" value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} placeholder="Buscar usuários" /></Field><Button type="submit" variant="outline">Buscar</Button></form>
    {roles.isError && <ErrorNotice message="Não foi possível carregar os papéis." retry={() => void roles.refetch()} />}
    {users.isRefetchError && users.data && <ErrorNotice message="Não foi possível atualizar os usuários." retry={() => void users.refetch()} />}
    {users.isPending ? <Loading /> : users.isError && !users.data ? <ErrorNotice message="Não foi possível carregar os usuários." retry={() => void users.refetch()} /> : items.length === 0 ? <Empty><EmptyTitle>Nenhum usuário encontrado</EmptyTitle><EmptyDescription>Tente buscar por outro nome ou e-mail.</EmptyDescription></Empty> : <div className="space-y-6">{[...groups].map(([id, members]) => {
      const role = roles.data?.roles.find((item) => item.id === id);
      return <Card key={id} className="overflow-hidden">
        <h2 className="flex items-center gap-2 border-b bg-muted/40 px-5 py-4 text-sm font-semibold">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: role?.color ?? "#737373" }} />
          <span className="min-w-0 break-words">{role?.name ?? "Papel indisponível"}</span>
        </h2>
        <ul className="divide-y">{members.map((user) => <li key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{user.name}{user.id === userId ? " (você)" : ""}</p><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>{user.banned && <p className="mt-1 text-xs text-muted-foreground">Bloqueado</p>}</div>
          <Button size="sm" variant="outline" className="shrink-0" disabled={!roles.data || roles.isError} onClick={() => { assign.reset(); setEditing(user); setRoleId(user.role); }}>Alterar papel<span className="sr-only"> de {user.name}</span></Button>
        </li>)}</ul>
      </Card>;
    })}</div>}

    {(users.hasNextPage || users.isFetchNextPageError) && <InfiniteScroll hasNextPage={users.hasNextPage} isFetching={users.isFetching} isFetchingNextPage={users.isFetchingNextPage} error={users.isFetchNextPageError} paused={users.isRefetchError} onLoadMore={loadMore} />}
    {editing && <Modal title="Alterar papel" description={`Defina o acesso de ${editing.name}. A alteração será aplicada às sessões existentes.`} pending={assign.isPending} onClose={() => setEditing(null)}>{assign.error && <div className="mb-4"><ErrorNotice message={accessError(assign.error)} /></div>}<form className="space-y-6" onSubmit={(event) => { event.preventDefault(); assign.mutate({ userId: editing.id, roleId }); }}><Field><FieldLabel htmlFor="user-role">Papel</FieldLabel><NativeSelect id="user-role" value={roleId} disabled={assign.isPending} onChange={(event) => setRoleId(event.target.value)}>{!roles.data?.roles.some((role) => role.id === roleId) && <NativeSelectOption value={roleId} disabled>Papel indisponível</NativeSelectOption>}{roles.data?.roles.map((role) => <NativeSelectOption key={role.id} value={role.id}>{role.name}</NativeSelectOption>)}</NativeSelect></Field><div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button type="button" variant="outline" disabled={assign.isPending} onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={assign.isPending || roleId === editing.role}>{assign.isPending ? "Salvando…" : "Salvar alteração"}</Button></div></form></Modal>}
  </section>;
}
