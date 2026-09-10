import type {
  TaskUser,
  UserDirectory,
} from "@server/domain/tasks/contracts/user-directory";
import type { Database } from "@server/infrastructure/database/client";
import { user } from "@server/infrastructure/database/schema/auth";
import { asc, ilike, inArray, or } from "drizzle-orm";

const fields = {
  id: user.id,
  name: user.name,
  username: user.displayUsername,
  canonical: user.username,
};

// O nome de exibição pode divergir do canônico apenas na capitalização.
function present(row: {
  id: string;
  name: string;
  username: string | null;
  canonical: string | null;
}): TaskUser {
  const { canonical, username } = row;
  const display =
    username && canonical && username.toLowerCase() === canonical.toLowerCase()
      ? username
      : canonical;
  return { id: row.id, name: row.name, username: display };
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function createUserDirectory(db: Database): UserDirectory {
  return {
    async byIds(ids) {
      if (ids.length === 0) {
        return [];
      }
      const rows = await db
        .select(fields)
        .from(user)
        .where(inArray(user.id, [...ids]));
      return rows.map(present);
    },
    async search(term, limit) {
      const pattern = `%${escapeLike(term)}%`;
      const rows = await db
        .select(fields)
        .from(user)
        .where(
          term
            ? or(ilike(user.name, pattern), ilike(user.username, pattern))
            : undefined
        )
        .orderBy(asc(user.name), asc(user.id))
        .limit(limit);
      return rows.map(present);
    },
  };
}
