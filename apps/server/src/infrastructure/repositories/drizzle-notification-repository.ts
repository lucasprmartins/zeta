import type {
  InboxScope,
  NotificationDraft,
  NotificationRepository,
} from "@server/domain/notifications/notifications";
import type {
  Database,
  Transaction,
} from "@server/infrastructure/database/client";
import { user } from "@server/infrastructure/database/schema/auth";
import { notifications } from "@server/infrastructure/database/schema/notifications";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

const PAGE_SIZE = 20;
function visible(scope: InboxScope) {
  return and(
    eq(notifications.recipientId, scope.recipientId),
    inArray(notifications.requiredPermission, [...scope.grants])
  );
}
// Recebe a transação do produtor. Nenhum efeito externo pode ser feito aqui.
export async function deliverNotifications(
  tx: Transaction,
  drafts: readonly NotificationDraft[]
) {
  if (drafts.length === 0) {
    return;
  }
  await tx
    .insert(notifications)
    .values(
      drafts.map((draft) => ({
        ...draft,
        id: crypto.randomUUID(),
        createdAt: new Date(draft.createdAt),
      }))
    )
    .onConflictDoNothing({
      target: [
        notifications.eventId,
        notifications.kind,
        notifications.recipientId,
      ],
    });
}
export function createNotificationRepository(
  db: Database
): NotificationRepository {
  return {
    async list(scope, filter) {
      const rows = await db
        .select({
          id: notifications.id,
          kind: notifications.kind,
          title: notifications.title,
          actorName: user.name,
          referenceType: notifications.referenceType,
          referenceId: notifications.referenceId,
          requiredPermission: notifications.requiredPermission,
          createdAt: notifications.createdAt,
          readAt: notifications.readAt,
        })
        .from(notifications)
        .leftJoin(user, eq(user.id, notifications.actorId))
        .where(
          and(
            visible(scope),
            filter.unread ? isNull(notifications.readAt) : undefined
          )
        )
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(PAGE_SIZE + 1)
        .offset((filter.page - 1) * PAGE_SIZE);
      return {
        items: rows.slice(0, PAGE_SIZE).map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          readAt: row.readAt?.toISOString() ?? null,
        })),
        hasMore: rows.length > PAGE_SIZE,
      };
    },
    async unreadCount(scope) {
      const [row] = await db
        .select({ value: count() })
        .from(notifications)
        .where(and(visible(scope), isNull(notifications.readAt)));
      return row?.value ?? 0;
    },
    async markRead(scope, id, at) {
      const rows = await db
        .update(notifications)
        .set({
          readAt: sql`coalesce(${notifications.readAt}, ${at}::timestamptz)`,
        })
        .where(and(visible(scope), eq(notifications.id, id)))
        .returning({ id: notifications.id });
      return rows.length > 0;
    },
  };
}
