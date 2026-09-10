import type { OpenAPI } from "@orpc/openapi";

// Contrato do transporte: o domínio nunca recebe cookies, headers ou sessões.
export interface Authentication {
  getOpenApiSchema?(): Promise<OpenAPI.Document>;
  handle(request: Request): Promise<Response>;
  resolveUser(
    headers: Headers
  ): Promise<{ id: string; role: string | null; grants: string[] } | null>;
}
