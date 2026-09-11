import {
  ArrowSquareOutIcon,
  CheckIcon,
  CheckSquareIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import {
  usePermissions,
  useRefreshSessionOnAuthError,
  useUserId,
} from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarPanel } from "@/components/ui/sidebar-panel";
import { actionErrorMessage, byId, useInfiniteList } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import {
  type InboxFilter,
  inboxQuery,
  type Notification,
  notificationKeys,
  unreadCountQuery,
} from "./queries";

function useInboxNavigation() {
  const { inbox } = useSearch({ from: "/_authenticated" });
  const navigate = useNavigate();
  const select = (filter: InboxFilter | undefined) =>
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, inbox: filter }),
      resetScroll: false,
    });
  return { filter: inbox, select };
}

export function InboxTrigger({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const { filter, select } = useInboxNavigation();
  const { pending, error } = usePermissions();
  const query = useQuery({
    ...unreadCountQuery(useUserId()),
    enabled: !(pending || error),
  });
  useRefreshSessionOnAuthError([query.error]);
  const count =
    pending || error || query.isError ? undefined : query.data?.count;
  const label =
    count === undefined
      ? "Caixa de entrada"
      : `Caixa de entrada, ${count} não lidas`;
  return (
    <button
      aria-expanded={!!filter}
      aria-haspopup="dialog"
      aria-label={label}
      className={cn(
        "relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-md px-[15px] text-muted-foreground text-sm transition-colors hover:bg-sidebar-active hover:text-foreground",
        filter && "bg-sidebar-active text-foreground"
      )}
      onClick={() => {
        onNavigate?.();
        select(filter ? undefined : "unread");
      }}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className="relative shrink-0">
        <TrayIcon aria-hidden="true" className="size-icon" />
        {!!count && collapsed && (
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </span>
      <span
        aria-hidden={collapsed}
        className={cn(
          "shrink-0 whitespace-nowrap transition-opacity duration-150",
          collapsed ? "opacity-0" : "opacity-100 delay-75"
        )}
      >
        Caixa de entrada
      </span>
      {!!count && !collapsed && (
        <span
          aria-hidden="true"
          className="ml-auto rounded bg-muted px-1.5 text-xs tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function InboxPanel({ collapsed }: { collapsed: boolean }) {
  const { filter, select } = useInboxNavigation();
  if (!filter) {
    return null;
  }
  return (
    <SidebarPanel
      collapsed={collapsed}
      onClose={() => select(undefined)}
      title="Caixa de entrada"
    >
      <InboxContent filter={filter} onFilter={select} />
    </SidebarPanel>
  );
}

function InboxContent({
  filter,
  onFilter,
}: {
  filter: InboxFilter;
  onFilter: (filter: InboxFilter) => void;
}) {
  const userId = useUserId();
  const access = usePermissions();
  const query = useInfiniteQuery({
    ...inboxQuery(userId, filter),
    enabled: !(access.pending || access.error),
  });
  const client = useQueryClient();
  const { items, loadMore } = useInfiniteList(query, byId);
  const read = useMutation({
    mutationFn: (id: string) => rpc.notifications.markRead({ id }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
  });
  useRefreshSessionOnAuthError([query.error, read.error]);
  const visible = items.filter((item) =>
    access.grants.includes(item.requiredPermission)
  );
  return (
    <>
      <fieldset
        aria-label="Filtrar notificações"
        className="flex shrink-0 gap-1 border-b px-4 py-3"
      >
        {(
          [
            ["unread", "Não lidas"],
            ["all", "Todas"],
          ] as const
        ).map(([value, label]) => (
          <Button
            aria-pressed={filter === value}
            className="min-h-11"
            key={value}
            onClick={() => onFilter(value)}
            variant={filter === value ? "soft" : "ghost"}
          >
            {label}
          </Button>
        ))}
      </fieldset>
      <div className="side-panel-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {read.isError && (
          <ErrorNotice
            message={actionErrorMessage(
              read.error,
              "Não foi possível marcar como lida. Tente novamente."
            )}
            retry={() => read.mutate(read.variables)}
          />
        )}
        {access.error ? (
          <ErrorNotice
            message="Não foi possível verificar suas permissões."
            retry={access.retry}
          />
        ) : access.pending || query.isPending ? (
          <Loading label="Carregando notificações…" />
        ) : (
          <>
            {query.isError && (
              <ErrorNotice
                message="Não foi possível atualizar sua caixa de entrada."
                retry={() => void query.refetch()}
              />
            )}
            {!query.isError && visible.length === 0 && (
              <Empty>
                <EmptyMedia>
                  <TrayIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "unread"
                    ? "Tudo em dia"
                    : "Sua caixa de entrada está vazia"}
                </EmptyTitle>
                <EmptyDescription>
                  Quando você for indicado como responsável por uma nova tarefa,
                  a notificação aparecerá aqui.
                </EmptyDescription>
              </Empty>
            )}
            <ul className="space-y-2">
              {visible.map((item) => (
                <NotificationItem
                  item={item}
                  key={item.id}
                  onRead={() => read.mutate(item.id)}
                  pending={read.isPending}
                />
              ))}
            </ul>
            <InfiniteScroll onLoadMore={loadMore} query={query} />
          </>
        )}
      </div>
    </>
  );
}

function NotificationItem({
  item,
  pending,
  onRead,
}: {
  item: Notification;
  pending: boolean;
  onRead: () => void;
}) {
  const date = new Date(item.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className={cn("rounded-lg border p-4", !item.readAt && "bg-muted/40")}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
          <CheckSquareIcon
            aria-hidden="true"
            className="size-icon text-muted-foreground"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">
              {item.actorName ?? "Uma conta removida"}
            </span>{" "}
            indicou você como responsável.
          </p>
          <time
            className="mt-1 block text-muted-foreground text-xs"
            dateTime={item.createdAt}
          >
            {date}
          </time>
        </div>
        {!item.readAt && (
          <span
            aria-label="Não lida"
            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
            role="img"
          />
        )}
      </div>
      {item.referenceType === "task" ? (
        <Link
          className="mt-3 flex min-h-11 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
          search={{ status: "all", task: item.referenceId, inbox: undefined }}
          to="/tasks"
        >
          <CheckSquareIcon
            aria-hidden="true"
            className="size-icon shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1 break-words font-medium">
            {item.title}
          </span>
          <ArrowSquareOutIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Link>
      ) : (
        <p className="mt-3 break-words font-medium text-sm">{item.title}</p>
      )}
      {!item.readAt && (
        <Button
          className="mt-2 min-h-11 w-full justify-start"
          disabled={pending}
          onClick={onRead}
          size="sm"
          variant="ghost"
        >
          <CheckIcon aria-hidden="true" />
          Marcar como lida
        </Button>
      )}
    </li>
  );
}
