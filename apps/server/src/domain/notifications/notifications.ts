import type { DomainEvent } from "../events";

export interface NotificationDraft {
  actorId: string;
  createdAt: string;
  eventId: string;
  kind: string;
  recipientId: string;
  referenceId: string;
  referenceType: string;
  requiredPermission: string;
  title: string;
}
export interface NotificationView {
  actorName: string | null;
  createdAt: string;
  id: string;
  kind: string;
  readAt: string | null;
  referenceId: string;
  referenceType: string;
  requiredPermission: string;
  title: string;
}
export interface InboxScope {
  grants: readonly string[];
  recipientId: string;
}
export interface NotificationRepository {
  list(
    scope: InboxScope,
    filter: { page: number; unread: boolean }
  ): Promise<{ items: NotificationView[]; hasMore: boolean }>;
  markRead(scope: InboxScope, id: string, at: string): Promise<boolean>;
  unreadCount(scope: InboxScope): Promise<number>;
}

// Política explícita: inclusive quem indica a si mesmo recebe a referência.
// Novos eventos ganham sua política aqui; Tarefas não conhece notificações.
export function notificationsFor(event: DomainEvent): NotificationDraft[] {
  switch (event.type) {
    case "task.created":
      return [...new Set(event.assigneeIds)].map((recipientId) => ({
        eventId: event.id,
        kind: "task.assigned",
        recipientId,
        actorId: event.actorId,
        title: event.title,
        referenceType: "task",
        referenceId: event.taskId,
        requiredPermission: "tasks:read",
        createdAt: event.occurredAt,
      }));
    default:
      return [];
  }
}
export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notificação não encontrada.");
  }
}
export function inbox(repository: NotificationRepository, now: () => string) {
  return {
    list: (scope: InboxScope, filter: { page: number; unread: boolean }) =>
      repository.list(scope, filter),
    unreadCount: async (scope: InboxScope) => ({
      count: await repository.unreadCount(scope),
    }),
    markRead: async (scope: InboxScope, id: string) => {
      if (!(await repository.markRead(scope, id, now()))) {
        throw new NotificationNotFoundError();
      }
      return { success: true };
    },
  };
}
export type Inbox = ReturnType<typeof inbox>;
