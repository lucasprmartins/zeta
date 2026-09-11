import { expect, test } from "bun:test";
import { type DomainEvent, eventPublisher } from "@server/domain/events";
import {
  inbox,
  NotificationNotFoundError,
  notificationsFor,
} from "@server/domain/notifications/notifications";
import { createTask } from "@server/domain/tasks/application/create-task";
import {
  InMemoryTaskRepository,
  InMemoryUserDirectory,
} from "../helpers/in-memory-task-repository";

const event: DomainEvent = {
  type: "task.created",
  id: "event-1",
  occurredAt: "2026-09-11T12:00:00.000Z",
  actorId: "ana",
  taskId: "task-1",
  title: "Revisar contrato",
  assigneeIds: ["ana", "bruno", "bruno"],
};

test("uma notificação por responsável, com referência, permissão e identidade do evento", () => {
  expect(notificationsFor(event)).toEqual(
    ["ana", "bruno"].map((recipientId) => ({
      eventId: "event-1",
      kind: "task.assigned",
      recipientId,
      actorId: "ana",
      title: event.title,
      referenceType: "task",
      referenceId: "task-1",
      requiredPermission: "tasks:read",
      createdAt: event.occurredAt,
    }))
  );
  expect(notificationsFor({ ...event, assigneeIds: [] })).toEqual([]);
});

test("criação entrega o fato normalizado junto da gravação e não emite em validação inválida", async () => {
  const tasks = new InMemoryTaskRepository();
  const originalSave = tasks.save.bind(tasks);
  const published: DomainEvent[] = [];
  tasks.save = async (task, events: readonly DomainEvent[] = []) => {
    await originalSave(task);
    published.push(...events);
  };
  const create = createTask({
    tasks,
    users: new InMemoryUserDirectory([
      { id: "ana", name: "Ana", username: "ana", image: null },
      { id: "bruno", name: "Bruno", username: "bruno", image: null },
    ]),
    generateId: () => "task-1",
    now: () => event.occurredAt,
  });
  await expect(
    create({
      authorId: "ana",
      title: "inválido",
      description: "",
      mentions: ["inexistente"],
    })
  ).rejects.toThrow();
  expect(published).toEqual([]);
  await create({
    authorId: "ana",
    title: " Revisar contrato ",
    description: "",
    mentions: ["bruno", "bruno"],
  });
  expect(published).toEqual([
    { ...event, id: "task.created:task-1", assigneeIds: ["bruno"] },
  ]);
});

test("assinantes são aguardados na mesma transação e uma falha interrompe a publicação", async () => {
  const context = { processed: [] as string[] };
  const publish = eventPublisher<typeof context>([
    async (_, tx) => {
      await Promise.resolve();
      tx.processed.push("primeiro");
    },
    () => Promise.reject(new Error("persistência falhou")),
    (_, tx) => {
      tx.processed.push("último");
      return Promise.resolve();
    },
  ]);
  await expect(publish([event], context)).rejects.toThrow(
    "persistência falhou"
  );
  expect(context.processed).toEqual(["primeiro"]);
});

test("caixa de entrada preserva escopo e não confirma leitura de item invisível", async () => {
  const scope = { recipientId: "bruno", grants: ["tasks:read"] };
  const service = inbox(
    {
      list: (received, filter) => {
        expect(received).toEqual(scope);
        expect(filter).toEqual({ page: 2, unread: true });
        return Promise.resolve({ items: [], hasMore: false });
      },
      unreadCount: (received) => {
        expect(received).toEqual(scope);
        return Promise.resolve(3);
      },
      markRead: (received, id, at) => {
        expect(received).toEqual(scope);
        expect(at).toBe(event.occurredAt);
        return Promise.resolve(id === "visible");
      },
    },
    () => event.occurredAt
  );
  expect(await service.list(scope, { page: 2, unread: true })).toEqual({
    items: [],
    hasMore: false,
  });
  expect(await service.unreadCount(scope)).toEqual({ count: 3 });
  expect(await service.markRead(scope, "visible")).toEqual({ success: true });
  await expect(service.markRead(scope, "other-user")).rejects.toBeInstanceOf(
    NotificationNotFoundError
  );
});
