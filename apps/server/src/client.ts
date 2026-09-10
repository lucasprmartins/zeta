// Superfície pública para consumidores: somente tipos, sem inicializar a API.
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./interfaces/http/rpc/router";

export type { AppRouter } from "./interfaces/http/rpc/router";
export type AppClient = RouterClient<AppRouter>;
