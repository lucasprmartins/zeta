import { queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

export const supportStatusQuery = (userId: string) =>
  queryOptions({
    queryKey: ["support", userId, "status"],
    queryFn: ({ signal }) => rpc.support.status(undefined, { signal }),
    staleTime: 0,
  });
