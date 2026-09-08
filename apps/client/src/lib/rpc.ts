import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppClient } from "@zeta/server/rpc";

const link = new RPCLink({
  url: new URL("/rpc", window.location.origin),
  fetch: (request, init) => fetch(request, { ...init, credentials: "same-origin" }),
});

export const rpc: AppClient = createORPCClient(link);
