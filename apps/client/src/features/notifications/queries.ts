import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { nextPageIfMore } from "@/lib/query";
import { rpc } from "@/lib/rpc";

export type InboxFilter = "all" | "unread";
export type Notification = Awaited<
  ReturnType<typeof rpc.notifications.list>
>["items"][number];
export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
};
export const unreadCountQuery = (userId: string) =>
  queryOptions({
    queryKey: [...notificationKeys.all(userId), "count"],
    queryFn: ({ signal }) => rpc.notifications.unreadCount({}, { signal }),
    refetchInterval: 15_000,
  });
export const inboxQuery = (userId: string, filter: InboxFilter) =>
  infiniteQueryOptions({
    queryKey: [...notificationKeys.all(userId), "infinite", filter],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      rpc.notifications.list({ page: pageParam, filter }, { signal }),
    getNextPageParam: nextPageIfMore,
    refetchInterval: 15_000,
  });
