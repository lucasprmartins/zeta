export type AccessRole = { id: string; name: string; color: string; grants: string[]; protected: boolean };
export class AccessError extends Error {
  constructor(public readonly code: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) { super(message); }
}
export function roleFields(name: string, grants: string[], available: readonly string[], color = "#737373") {
  const normalized = name.trim();
  if (!normalized || normalized.length > 60) throw new AccessError("BAD_REQUEST", "Use um nome de 1 a 60 caracteres.");
  if (grants.some((grant) => !available.includes(grant))) throw new AccessError("BAD_REQUEST", "Permissão desconhecida ou reservada à administração.");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new AccessError("BAD_REQUEST", "Informe uma cor hexadecimal válida, como #737373.");
  return { color: color.toLowerCase(), name: normalized, grants: [...new Set(grants)].sort() };
}


// O administrador acompanha o catálogo; concessões persistidas não limitam esse papel.
export function effectiveRoleGrants(role: Pick<AccessRole, "id" | "grants">, available: readonly string[]): string[] {
  return role.id === "admin" ? [...available, "access:manage"] : role.grants.filter((grant) => available.includes(grant));
}
