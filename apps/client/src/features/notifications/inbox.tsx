import { CheckIcon, TrayIcon } from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ErrorNotice, Loading } from "@/components/feedback";
import { InfiniteScroll } from "@/components/infinite-scroll";
import {
  usePermissions,
  useRefreshSessionOnAuthError,
  useUserId,
} from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarPanel } from "@/components/ui/sidebar-panel";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { actionErrorMessage, byId, useInfiniteList } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { notificationPresentation } from "./presentation";
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
      <div className="shrink-0 border-b px-5 py-3">
        <ToggleGroup
          aria-label="Filtrar notificações"
          className="grid w-full grid-cols-2 rounded-lg bg-muted/70 p-1"
          onValueChange={(value) => {
            if (value === "all" || value === "unread") {
              onFilter(value);
            }
          }}
          type="single"
          value={filter}
        >
          <ToggleGroupItem
            className="w-full data-[state=on]:bg-background data-[state=on]:shadow-sm"
            value="unread"
          >
            Não lidas
          </ToggleGroupItem>
          <ToggleGroupItem
            className="w-full data-[state=on]:bg-background data-[state=on]:shadow-sm"
            value="all"
          >
            Todas
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="sidebar-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {read.isError && (
          <div className="p-5 pb-0">
            <ErrorNotice
              message={actionErrorMessage(
                read.error,
                "Não foi possível marcar como lida. Tente novamente."
              )}
              retry={() => read.mutate(read.variables)}
            />
          </div>
        )}
        {access.error ? (
          <div className="p-5">
            <ErrorNotice
              message="Não foi possível verificar suas permissões."
              retry={access.retry}
            />
          </div>
        ) : access.pending || query.isPending ? (
          <div className="p-5">
            <Loading label="Carregando notificações…" />
          </div>
        ) : (
          <>
            {query.isError && (
              <div className="p-5 pb-0">
                <ErrorNotice
                  message="Não foi possível atualizar sua caixa de entrada."
                  retry={() => void query.refetch()}
                />
              </div>
            )}
            {!query.isError && visible.length === 0 && (
              <div className="p-5">
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
                    {filter === "unread"
                      ? "Você está em dia com suas notificações."
                      : "As notificações sobre atividades do sistema aparecerão aqui."}
                  </EmptyDescription>
                </Empty>
              </div>
            )}
            <ul className="space-y-3 px-3 py-4">
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
  const presentation = notificationPresentation(item);
  const NotificationIcon = presentation.icon;
  return (
    <li>
      <Card
        className={cn(
          "overflow-hidden shadow-none transition-[border-color,box-shadow] hover:border-input hover:shadow-xs",
          !item.readAt && "border-primary/20 bg-primary/[0.025]"
        )}
      >
        <div className="flex items-start gap-3 px-3 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <NotificationIcon aria-hidden="true" className="size-icon" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-muted-foreground text-xs">
                {presentation.source}
              </p>
              {!item.readAt && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wide">
                  Nova
                </span>
              )}
              <time
                className="ml-auto shrink-0 text-muted-foreground text-xs"
                dateTime={item.createdAt}
              >
                {date}
              </time>
            </div>
            <p className="mt-1 text-sm leading-relaxed">
              {presentation.message}
            </p>
            <p className="mt-3 break-words font-medium text-sm">{item.title}</p>
          </div>
        </div>
        {(presentation.action || !item.readAt) && (
          <div className="flex min-h-12 items-center gap-1 border-t bg-muted/25 px-2 py-1.5">
            {!item.readAt && (
              <Button
                className="text-muted-foreground"
                disabled={pending}
                onClick={onRead}
                size="sm"
                variant="ghost"
              >
                <CheckIcon aria-hidden="true" />
                Marcar como lida
              </Button>
            )}
            {presentation.action && (
              <div className="ml-auto">{presentation.action}</div>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}
