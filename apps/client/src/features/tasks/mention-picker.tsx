import { CheckIcon, UsersIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { Avatar } from "@/components/ui/avatar";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_MENTIONS, mentionableUsersQuery, type TaskUser } from "./queries";

const placeholders = ["first", "second", "third"];

export function MentionPicker({
  userId,
  value,
  onChange,
  disabled,
}: {
  userId: string;
  value: TaskUser[];
  onChange: (users: TaskUser[]) => void;
  disabled: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const users = useQuery(mentionableUsersQuery(userId, term));
  const selected = new Set(value.map((user) => user.id));
  const full = value.length >= MAX_MENTIONS;

  function toggle(user: TaskUser) {
    if (selected.has(user.id)) {
      onChange(value.filter((item) => item.id !== user.id));
      return;
    }
    if (!full) {
      onChange([...value, user]);
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-search`}>
        Responsável{" "}
        <span className="font-normal text-muted-foreground">(opcional)</span>
      </FieldLabel>
      <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
        Quem for indicado aqui responde por esta tarefa e aparece na lista.
        {full ? ` Limite de ${MAX_MENTIONS} contas atingido.` : ""}
      </p>
      {value.length > 0 && (
        <ul
          aria-label="Responsáveis indicados"
          className="flex flex-wrap gap-2"
        >
          {value.map((user) => (
            <li key={user.id}>
              <button
                aria-label={`Remover ${user.name}`}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border bg-sidebar py-1 pr-2.5 pl-1 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                disabled={disabled}
                onClick={() => toggle(user)}
                type="button"
              >
                <Avatar image={user.image} name={user.name} size="sm" />
                <span className="max-w-40 truncate">{user.name}</span>
                <XIcon aria-hidden="true" className="size-3.5 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        id={`${id}-search`}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        placeholder="Buscar responsável por nome ou usuário"
        type="search"
        value={search}
      />
      <div className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border">
        {users.isPending ? (
          <ul className="divide-y">
            {placeholders.map((row) => (
              <li className="flex items-center gap-3 px-3 py-2.5" key={row}>
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </li>
            ))}
          </ul>
        ) : users.isError ? (
          <div className="p-4">
            <ErrorNotice
              message="Não foi possível carregar as contas."
              retry={() => void users.refetch()}
            />
          </div>
        ) : users.data.items.length === 0 ? (
          <Empty className="min-h-32 p-6">
            <EmptyTitle>Nenhuma conta encontrada</EmptyTitle>
            <EmptyDescription>
              {term
                ? "Tente outro nome ou usuário."
                : "Nenhuma conta disponível para indicar."}
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="divide-y">
            {users.data.items.map((user) => {
              const active = selected.has(user.id);
              return (
                <li key={user.id}>
                  <button
                    aria-pressed={active}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-sidebar focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-50"
                    disabled={disabled || (full && !active)}
                    onClick={() => toggle(user)}
                    type="button"
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
                    >
                      {active && <CheckIcon className="size-3.5" />}
                    </span>
                    <Avatar image={user.image} name={user.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {user.name}
                      </span>
                      {user.username && (
                        <span className="block truncate text-muted-foreground text-xs">
                          @{user.username}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <UsersIcon aria-hidden="true" className="size-3.5" />
          Nenhum responsável indicado.
        </p>
      )}
    </Field>
  );
}
