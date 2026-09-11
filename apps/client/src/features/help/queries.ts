import { queryOptions } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

export const helpStatusQuery = (userId: string) =>
  queryOptions({
    queryKey: ["help", userId, "status"],
    queryFn: ({ signal }) => rpc.help.status(undefined, { signal }),
    staleTime: 0,
  });
