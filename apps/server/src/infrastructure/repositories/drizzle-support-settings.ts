import { effectiveRoleGrants } from "@server/domain/authorization/entities/role";
import {
  type SupportConfiguration,
  SupportError,
  type SupportSettings,
} from "@server/domain/support/support";
import {
  can,
  permissionIds,
  permissions,
} from "@server/infrastructure/auth/access";
import type { Database } from "@server/infrastructure/database/client";
import { accessRoles } from "@server/infrastructure/database/schema/access";
import { user } from "@server/infrastructure/database/schema/auth";
import { supportSettings } from "@server/infrastructure/database/schema/support";
import { secretCipher } from "@server/infrastructure/support/secret";
import { eq, sql } from "drizzle-orm";

export function createSupportSettings(
  db: Database,
  secret: string
): SupportSettings {
  const cipher = secretCipher(secret);
  return {
    async configured() {
      return (
        (
          await db
            .select({ id: supportSettings.id })
            .from(supportSettings)
            .where(eq(supportSettings.id, "webhook"))
        ).length > 0
      );
    },
    async get() {
      const [row] = await db
        .select()
        .from(supportSettings)
        .where(eq(supportSettings.id, "webhook"));
      return row
        ? (JSON.parse(
            await (await cipher).decrypt(row.encryptedConfiguration)
          ) as SupportConfiguration)
        : null;
    },
    async requester(actorId) {
      const [actor] = await db.select().from(user).where(eq(user.id, actorId));
      return actor && !actor.banned && !actor.approvalPending
        ? { id: actor.id, name: actor.name, email: actor.email }
        : null;
    },
    async save(actorId, input) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(782341901)`);
        const [actor] = await tx
          .select()
          .from(user)
          .where(eq(user.id, actorId));
        const role = actor?.role
          ? (
              await tx
                .select()
                .from(accessRoles)
                .where(eq(accessRoles.id, actor.role))
            )[0]
          : null;
        if (
          !actor ||
          actor.banned ||
          actor.approvalPending ||
          !role ||
          !can(
            effectiveRoleGrants(role, permissionIds),
            permissions.access.manage
          )
        ) {
          throw new SupportError(
            "FORBIDDEN",
            "Você não tem permissão para configurar o suporte."
          );
        }
        if (input.webhookUrl === null) {
          await tx
            .delete(supportSettings)
            .where(eq(supportSettings.id, "webhook"));
          return;
        }
        const [previousRow] = await tx
          .select()
          .from(supportSettings)
          .where(eq(supportSettings.id, "webhook"));
        const previous = previousRow
          ? (JSON.parse(
              await (await cipher).decrypt(previousRow.encryptedConfiguration)
            ) as SupportConfiguration)
          : null;
        const sourceName = input.sourceName?.trim() || previous?.sourceName;
        if (!sourceName) {
          throw new SupportError(
            "BAD_REQUEST",
            "Informe o nome do sistema ou cliente."
          );
        }
        const configuration: SupportConfiguration = {
          webhookUrl: input.webhookUrl,
          token:
            input.token === undefined ? (previous?.token ?? null) : input.token,
          sourceName,
        };
        const encryptedConfiguration = await (await cipher).encrypt(
          JSON.stringify(configuration)
        );
        await tx
          .insert(supportSettings)
          .values({ id: "webhook", encryptedConfiguration })
          .onConflictDoUpdate({
            target: supportSettings.id,
            set: { encryptedConfiguration },
          });
      });
    },
  };
}
