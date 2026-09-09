import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { UserForm } from "./user-form";
import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { Loading, ErrorNotice } from "@/components/feedback";
import { rolesQuery, usersQuery, type AccessUser } from "./queries";

export function UsersPanel({ userId, search, onSearch }: { userId: string; search: string; onSearch: (search: string) => void }) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const [editing, setEditing] = useState<AccessUser | "new" | null>(null);
  const roles = useQuery(rolesQuery(userId));
  const users = useInfiniteQuery(usersQuery(userId, search));
  const items = [...new Map(users.data?.pages.flatMap((page) => page.items).map((user) => [user.id, user]) ?? []).values()];
  const groups = Map.groupBy(items, (user) => user.role);
  const { hasNextPage, isFetching, fetchNextPage } = users;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetching) void fetchNextPage({ cancelRefetch: false }); }, [hasNextPage, isFetching, fetchNextPage]);
  return <section aria-label="Usuários" className="space-y-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <form className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-nowrap" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}><Field className="min-w-0 flex-1 basis-full sm:basis-auto"><FieldLabel htmlFor="users-search" className="sr-only">Buscar usuário por nome ou e-mail</FieldLabel><div className="relative"><MagnifyingGlassIcon size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" id="users-search" value={draft} maxLength={254} onChange={(event) => { setDraft(event.target.value); }} placeholder="Buscar usuário por nome ou e-mail..." autoCapitalize="none" spellCheck={false} /></div></Field><Button type="submit" variant="outline">Buscar</Button>{search && <Button type="button" variant="ghost" onClick={() => { setDraft(""); onSearch(""); }}>Limpar</Button>}</form>
      <Button disabled={!roles.data || roles.isError} onClick={() => setEditing("new")}><PlusIcon size={18} />Adicionar usuário</Button>
    </div>
    {roles.isError && <ErrorNotice message="Não foi possível carregar os papéis." retry={() => void roles.refetch()} />}
    {users.isRefetchError && users.data && <ErrorNotice message="Não foi possível atualizar os usuários." retry={() => void users.refetch()} />}
    {users.isPending ? <Loading /> : users.isError && !users.data ? <ErrorNotice message="Não foi possível carregar os usuários." retry={() => void users.refetch()} /> : items.length === 0 ? <Empty><EmptyTitle>Nenhum usuário encontrado</EmptyTitle><EmptyDescription>{search ? "Tente outro nome, nome de usuário ou e-mail." : "Adicione um usuário para começar."}</EmptyDescription></Empty> : <div className="space-y-6">{[...groups].map(([id, members]) => {
      const role = roles.data?.roles.find((item) => item.id === id);
      return <Card key={id} className="overflow-hidden">
        <h2 className="flex items-center gap-2 border-b bg-muted/40 px-5 py-4 text-sm font-semibold">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: role?.color ?? "#737373" }} />
          <span className="min-w-0 break-words">{role?.name ?? "Papel indisponível"}</span>
        </h2>
        <ul className="divide-y">{members.map((user) => <li key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{user.name}{user.id === userId ? " (você)" : ""}</p>{user.username && <p className="mt-1 break-all text-sm text-muted-foreground">@{user.username}</p>}<p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>{user.banned && <p className="mt-1 text-xs text-muted-foreground">Bloqueado</p>}</div>
          <Button size="icon" variant="outline" className="shrink-0 self-end sm:self-center" disabled={!roles.data || roles.isError} onClick={() => setEditing(user)} aria-label={`Editar usuário ${user.name}`}><PencilSimpleIcon size={18} /></Button>
        </li>)}</ul>
      </Card>;
    })}</div>}

    {(users.hasNextPage || users.isFetchNextPageError) && <InfiniteScroll hasNextPage={users.hasNextPage} isFetching={users.isFetching} isFetchingNextPage={users.isFetchingNextPage} error={users.isFetchNextPageError} paused={users.isRefetchError} onLoadMore={loadMore} />}
    {editing && roles.data && <UserForm initial={editing === "new" ? null : editing} roles={roles.data.roles} actorId={userId} onClose={() => setEditing(null)} />}
  </section>;
}
