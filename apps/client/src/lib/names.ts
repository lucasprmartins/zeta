// Duas letras bastam para distinguir contas numa lista.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.at(0) ?? "?";
  const last = parts.length > 1 ? (parts.at(-1)?.at(0) ?? "") : "";
  return `${first}${last}`;
}

const NAME_LIMIT = 12;

// A inicial do sobrenome separa homônimos: "Lucas" e "Lucas J." são pessoas distintas.
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const [first = name.trim()] = parts;
  const clipped =
    first.length > NAME_LIMIT ? `${first.slice(0, NAME_LIMIT)}…` : first;
  const last = parts.length > 1 ? parts.at(-1)?.at(0) : undefined;
  return last ? `${clipped} ${last.toUpperCase()}.` : clipped;
}
