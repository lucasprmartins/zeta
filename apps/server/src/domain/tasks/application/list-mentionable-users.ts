import type { UserDirectory } from "../contracts/user-directory";

const LIMIT = 20;

// Alimenta o seletor de menções: qualquer conta do sistema pode ser indicada.
export function listMentionableUsers(users: UserDirectory) {
  return async (input: { search?: string }) => ({
    items: await users.search((input.search ?? "").trim(), LIMIT),
  });
}
