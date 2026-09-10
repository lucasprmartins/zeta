import type {
  AccessRepository,
  AccessStore,
} from "@server/domain/authorization/contracts/access-repository";
import { defaultRegistrationPolicy } from "@server/domain/authorization/entities/registration-policy";
import type {
  Database,
  DatabaseConnection,
} from "@server/infrastructure/database/client";
import { accessRoles } from "@server/infrastructure/database/schema/access";
import { user } from "@server/infrastructure/database/schema/auth";
import { registrationSettings } from "@server/infrastructure/database/schema/settings";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { pageLimit, pageOffset, paginate } from "./pagination";

function store(
  db: Pick<Database, "select" | "insert" | "update" | "delete">
): AccessStore {
  const columns = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    banned: user.banned,
  };
  return {
    async registrationPolicy() {
      const row = (
        await db
          .select()
          .from(registrationSettings)
          .where(eq(registrationSettings.id, "registration"))
      )[0];
      return row
        ? { allowSignUp: row.allowSignUp, requireApproval: row.requireApproval }
        : { ...defaultRegistrationPolicy };
    },
    async saveRegistrationPolicy(policy) {
      await db
        .insert(registrationSettings)
        .values({ id: "registration", ...policy })
        .onConflictDoUpdate({ target: registrationSettings.id, set: policy });
    },
    async pendingUsers(page) {
      const items = await db
        .select(columns)
        .from(user)
        .where(eq(user.approvalPending, true))
        .orderBy(asc(user.createdAt), asc(user.id))
        .limit(pageLimit)
        .offset(pageOffset(page));
      return paginate(items);
    },
    async pendingCount() {
      return (
        await db
          .select({ total: count() })
          .from(user)
          .where(eq(user.approvalPending, true))
      )[0]!.total;
    },
    async approve(userId) {
      return (
        (
          await db
            .update(user)
            .set({ approvalPending: false })
            .where(and(eq(user.id, userId), eq(user.approvalPending, true)))
            .returning({ id: user.id })
        ).length > 0
      );
    },
    async role(id) {
      return (
        (
          await db.select().from(accessRoles).where(eq(accessRoles.id, id))
        )[0] ?? null
      );
    },
    roles: () => db.select().from(accessRoles).orderBy(asc(accessRoles.name)),
    async user(id) {
      return (
        (await db.select(columns).from(user).where(eq(user.id, id)))[0] ?? null
      );
    },
    async users(page, search) {
      // Substring literal: % e _ digitados não viram curingas SQL.
      const condition = sql`(strpos(lower(${user.name}), lower(${search})) > 0 or strpos(lower(${user.username}), lower(${search})) > 0 or strpos(lower(${user.email}), lower(${search})) > 0)`;
      const items = await db
        .select(columns)
        .from(user)
        .leftJoin(accessRoles, eq(user.role, accessRoles.id))
        .where(
          and(eq(user.approvalPending, false), search ? condition : undefined)
        )
        .orderBy(
          asc(sql`coalesce(${accessRoles.name}, ${user.role})`),
          asc(user.role),
          asc(user.name),
          asc(user.id)
        )
        .limit(pageLimit)
        .offset(pageOffset(page));
      return paginate(items);
    },
    async save(role) {
      await db
        .insert(accessRoles)
        .values(role)
        .onConflictDoUpdate({
          target: accessRoles.id,
          set: { name: role.name, color: role.color, grants: role.grants },
        });
    },
    async remove(id) {
      await db.delete(accessRoles).where(eq(accessRoles.id, id));
    },
    async assigned(id) {
      return (
        (
          await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.role, id))
            .limit(1)
        ).length > 0
      );
    },
    async assign(userId, roleId) {
      await db.update(user).set({ role: roleId }).where(eq(user.id, userId));
    },
    async activeAdmins() {
      return (
        await db
          .select({ total: count() })
          .from(user)
          .where(
            and(
              eq(user.role, "admin"),
              eq(user.banned, false),
              eq(user.approvalPending, false)
            )
          )
      )[0]!.total;
    },
  };
}
export function createAccessRepository(
  db: DatabaseConnection
): AccessRepository {
  return {
    ...store(db),
    transaction: (work) =>
      db.transaction(async (tx) => {
        // Um único lock entre painel e CLI impede corridas ao remover o último admin.
        await tx.execute(sql`select pg_advisory_xact_lock(782341901)`);
        return work(store(tx));
      }),
  };
}
