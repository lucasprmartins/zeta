import type { JSONSchema } from "@orpc/openapi";
import { ORPCError } from "@orpc/server";

// Um único contrato de entrada para todas as procedures: o transporte confere
// forma e limites; as invariantes continuam no domínio.
const MAX_PAGE = 1_000_000;

export function invalid(message: string): never {
  throw new ORPCError("BAD_REQUEST", { message });
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid("Informe um objeto válido.");
  }
  return value as Record<string, unknown>;
}

type TextOptions = {
  field: string;
  max?: number;
  /** Conteúdo livre, como Markdown, preserva os espaços das bordas. */
  trim?: boolean;
  /** Deixe `false` quando a entidade de domínio for a autoridade sobre o vazio. */
  required?: boolean;
};

export function text(value: unknown, options: TextOptions): string {
  const { field, max = 120, trim = true, required = true } = options;
  if (typeof value !== "string" || value.length > max) {
    return invalid(`Informe ${field} como texto de até ${max} caracteres.`);
  }
  const parsed = trim ? value.trim() : value;
  if (required && !parsed.trim()) {
    return invalid(`Informe ${field}.`);
  }
  return parsed;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuid(value: unknown, field = "o identificador"): string {
  const parsed = text(value, { field, max: 36 });
  return UUID.test(parsed) ? parsed : invalid("Identificador inválido.");
}

// A rota REST entrega a página como texto da query; o RPC entrega como número.
export function page(value: unknown): number {
  if (value === undefined) {
    return 1;
  }
  const parsed =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (
    typeof parsed !== "number" ||
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_PAGE
  ) {
    return invalid("Página inválida.");
  }
  return parsed;
}

export const textSchema: JSONSchema = { type: "string" };
export const pageSchema: JSONSchema = {
  type: "integer",
  minimum: 1,
  maximum: MAX_PAGE,
  default: 1,
};
