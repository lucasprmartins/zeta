import { effectiveRoleGrants } from "@server/domain/authorization/entities/role";
import { HelpError, type HelpSettings } from "@server/domain/help/help";
import { secretCipher } from "@server/infrastructure/ai/secret";
import {
  can,
  permissionIds,
  permissions,
} from "@server/infrastructure/auth/access";
import type { Database } from "@server/infrastructure/database/client";
import { accessRoles } from "@server/infrastructure/database/schema/access";
import { user } from "@server/infrastructure/database/schema/auth";
import { helpSettings } from "@server/infrastructure/database/schema/settings";
import { eq, sql } from "drizzle-orm";

export function createHelpSettings(db: Database, secret: string): HelpSettings {
  const cipher = secretCipher(secret);
  return {
    async configured() {
      return (
        (
          await db
            .select({ id: helpSettings.id })
            .from(helpSettings)
            .where(eq(helpSettings.id, "openai"))
        ).length > 0
      );
    },
    async apiKey() {
      const [row] = await db
        .select()
        .from(helpSettings)
        .where(eq(helpSettings.id, "openai"));
      return row ? (await cipher).decrypt(row.encryptedApiKey) : null;
    },
    async save(actorId, apiKey) {
      const encryptedApiKey =
        apiKey === null ? null : await (await cipher).encrypt(apiKey);
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
          throw new HelpError(
            "FORBIDDEN",
            "Você não tem permissão para configurar a ajuda."
          );
        }
        if (encryptedApiKey === null) {
          await tx.delete(helpSettings).where(eq(helpSettings.id, "openai"));
        } else {
          await tx
            .insert(helpSettings)
            .values({ id: "openai", encryptedApiKey })
            .onConflictDoUpdate({
              target: helpSettings.id,
              set: { encryptedApiKey },
            });
        }
      });
    },
  };
}
