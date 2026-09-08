import type { OpenAPI } from "@orpc/openapi";

// Contrato do transporte: o domínio nunca recebe cookies, headers ou sessões.
export interface Authentication {
  handle(request: Request): Promise<Response>;
  resolveUser(headers: Headers): Promise<{ id: string } | null>;
  getOpenApiSchema?(): Promise<OpenAPI.Document>;
}
