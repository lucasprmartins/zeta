import {
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { useUserId } from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { byId, useInfiniteList } from "@/lib/query";
import { type AccessUser, rolesQuery, usersQuery } from "./queries";
import { RoleDot } from "./role-dot";
import { UserForm } from "./user-form";

export function UsersPanel({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (search: string) => void;
}) {
  const userId = useUserId();
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const [editing, setEditing] = useState<AccessUser | "new" | null>(null);
  const roles = useQuery(rolesQuery(userId));
  const users = useInfiniteQuery(usersQuery(userId, search));
  const { items, loadMore } = useInfiniteList(users, byId);
  const groups = Map.groupBy(items, (user) => user.role);
  return (
    <section aria-label="Usuários" className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-nowrap"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(draft.trim());
          }}
        >
          <Field className="min-w-0 flex-1 basis-full sm:basis-auto">
            <FieldLabel className="sr-only" htmlFor="users-search">
              Buscar usuário por nome ou e-mail
            </FieldLabel>
            <div className="relative">
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                autoCapitalize="none"
                className="pl-10"
                id="users-search"
                maxLength={254}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
                placeholder="Buscar usuário por nome ou e-mail..."
                spellCheck={false}
                value={draft}
              />
            </div>
          </Field>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {search && (
            <Button
              onClick={() => {
                setDraft("");
                onSearch("");
              }}
              type="button"
              variant="ghost"
            >
              Limpar
            </Button>
          )}
        </form>
        <Button
          disabled={!roles.data || roles.isError}
          onClick={() => setEditing("new")}
        >
          <PlusIcon size={18} />
          Adicionar usuário
        </Button>
      </div>
      {roles.isError && (
        <ErrorNotice
          message="Não foi possível carregar os papéis."
          retry={() => void roles.refetch()}
        />
      )}
      {users.isRefetchError && users.data && (
        <ErrorNotice
          message="Não foi possível atualizar os usuários."
          retry={() => void users.refetch()}
        />
      )}
      {users.isPending ? (
        <Loading />
      ) : users.isError && !users.data ? (
        <ErrorNotice
          message="Não foi possível carregar os usuários."
          retry={() => void users.refetch()}
        />
      ) : items.length === 0 ? (
        <Empty>
          <EmptyTitle>Nenhum usuário encontrado</EmptyTitle>
          <EmptyDescription>
            {search
              ? "Tente outro nome, nome de usuário ou e-mail."
              : "Adicione um usuário para começar."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="space-y-6">
          {[...groups].map(([id, members]) => {
            const role = roles.data?.roles.find((item) => item.id === id);
            return (
              <Card className="overflow-hidden" key={id}>
                <h2 className="flex items-center gap-2 border-b bg-muted/40 px-5 py-4 font-semibold text-sm">
                  <RoleDot color={role?.color} />
                  <span className="min-w-0 break-words">
                    {role?.name ?? "Papel indisponível"}
                  </span>
                </h2>
                <ul className="divide-y">
                  {members.map((user) => (
                    <li
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      key={user.id}
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium text-sm">
                          {user.name}
                          {user.id === userId ? " (você)" : ""}
                        </p>
                        {user.username && (
                          <p className="mt-1 break-all text-muted-foreground text-sm">
                            @{user.username}
                          </p>
                        )}
                        <p className="mt-1 break-all text-muted-foreground text-sm">
                          {user.email}
                        </p>
                        {user.banned && (
                          <p className="mt-1 text-muted-foreground text-xs">
                            Bloqueado
                          </p>
                        )}
                      </div>
                      <Button
                        aria-label={`Editar usuário ${user.name}`}
                        className="shrink-0 self-end sm:self-center"
                        disabled={!roles.data || roles.isError}
                        onClick={() => setEditing(user)}
                        size="icon"
                        variant="outline"
                      >
                        <PencilSimpleIcon size={18} />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {(users.hasNextPage || users.isFetchNextPageError) && (
        <InfiniteScroll onLoadMore={loadMore} query={users} />
      )}
      {editing && roles.data && (
        <UserForm
          actorId={userId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          roles={roles.data.roles}
        />
      )}
    </section>
  );
}
