import { expect, test } from "bun:test";
import { createTask } from "@server/domain/tasks/application/create-task";
import { deleteTask } from "@server/domain/tasks/application/delete-task";
import { listMentionableUsers } from "@server/domain/tasks/application/list-mentionable-users";
import { listTasks } from "@server/domain/tasks/application/list-tasks";
import { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import { summarizeTasks } from "@server/domain/tasks/application/summarize-tasks";
import { TaskNotFoundError } from "@server/domain/tasks/application/task-not-found";
import { updateTask } from "@server/domain/tasks/application/update-task";
import {
  InvalidTaskError,
  MAX_MENTIONS,
  Task,
} from "@server/domain/tasks/entities/task";
import {
  InMemoryTaskRepository,
  InMemoryUserDirectory,
} from "../helpers/in-memory-task-repository";

const input = {
  id: "task-1",
  authorId: "author-1",
  title: " Revisar API ",
  description: " Detalhes ",
  createdAt: "2026-09-05T12:00:00.000Z",
};
const later = "2026-09-05T13:00:00.000Z";
const directory = new InMemoryUserDirectory([
  { id: "author-1", name: "Ana", username: "ana", image: null },
  {
    id: "user-2",
    name: "Bruno",
    username: "bruno",
    image: "https://example.test/bruno.png",
  },
  { id: "user-3", name: "Carla", username: null, image: null },
]);

test("normaliza a tarefa e protege seu estado interno", () => {
  const task = Task.create(input);
  expect(task.toJSON()).toMatchObject({
    title: "Revisar API",
    description: "Detalhes",
    status: "pending",
    completedAt: null,
    mentions: [],
  });
  const snapshot = task.toJSON();
  Object.assign(snapshot, { title: "Alterado" });
  expect(task.toJSON().title).toBe("Revisar API");
  for (const title of [" ", "x".repeat(121)]) {
    expect(() => Task.create({ ...input, title })).toThrow(InvalidTaskError);
  }
  expect(() =>
    Task.create({ ...input, description: "x".repeat(2001) })
  ).toThrow(InvalidTaskError);
  expect(() => Task.create({ ...input, createdAt: "invalid" })).toThrow(
    InvalidTaskError
  );
});

test("concluir é idempotente; reabrir limpa a conclusão sem mudar a criação", () => {
  const task = Task.create(input);
  const completed = task.complete(later);
  expect(completed.toJSON()).toMatchObject({
    status: "completed",
    completedAt: later,
    updatedAt: later,
  });
  expect(completed.complete("2026-09-06T12:00:00.000Z").toJSON()).toEqual(
    completed.toJSON()
  );
  const reopened = completed.reopen(later);
  expect(reopened.toJSON()).toMatchObject({
    status: "pending",
    completedAt: null,
    createdAt: input.createdAt,
  });
  expect(task.toJSON().status).toBe("pending");
  expect(() =>
    Task.restore({ ...completed.toJSON(), completedAt: null })
  ).toThrow(InvalidTaskError);
  expect(() =>
    task.edit({ title: "Título", description: "" }, "2025-01-01T00:00:00Z")
  ).toThrow(InvalidTaskError);
});

test("a tarefa sobrevive à remoção do autor e mantém menções sem repetição", () => {
  const orphan = Task.restore({
    ...Task.create(input).toJSON(),
    authorId: null,
  });
  expect(orphan.toJSON().authorId).toBeNull();
  expect(() =>
    Task.restore({ ...Task.create(input).toJSON(), authorId: " " })
  ).toThrow(InvalidTaskError);

  const mentioned = Task.create({
    ...input,
    mentions: [" user-2 ", "user-2", "user-3"],
  });
  expect(mentioned.toJSON().mentions).toEqual(["user-2", "user-3"]);
  // Cada leitura devolve uma cópia: quem recebe não altera a entidade.
  expect(mentioned.toJSON().mentions).not.toBe(mentioned.toJSON().mentions);
  expect(() => Task.create({ ...input, mentions: [" "] })).toThrow(
    InvalidTaskError
  );
  expect(() =>
    Task.create({
      ...input,
      mentions: Array.from({ length: MAX_MENTIONS + 1 }, (_, i) => `u-${i}`),
    })
  ).toThrow(InvalidTaskError);
  // Editar sem informar menções preserva as existentes.
  expect(
    mentioned.edit({ title: "Outro", description: "" }, later).toJSON().mentions
  ).toEqual(["user-2", "user-3"]);
});

test("qualquer tarefa é alcançável: a autoria não restringe as operações", async () => {
  const tasks = new InMemoryTaskRepository();
  const create = createTask({
    tasks,
    users: directory,
    generateId: () => input.id,
    now: () => input.createdAt,
  });
  await expect(create({ ...input, title: " " })).rejects.toThrow(
    InvalidTaskError
  );
  expect(tasks.items).toHaveLength(0);
  await create(input);

  // Outra conta edita, conclui e exclui a tarefa criada por "author-1".
  const edited = await updateTask(
    tasks,
    directory,
    () => later
  )({ id: input.id, title: " Novo título ", description: "Texto" });
  expect(edited).toMatchObject({
    title: "Novo título",
    status: "pending",
    updatedAt: later,
  });
  expect(edited.author).toMatchObject({ id: "author-1", name: "Ana" });

  await setTaskStatus(
    tasks,
    directory,
    () => later
  )({ id: input.id, status: "completed" });
  expect(tasks.items[0]?.toJSON().status).toBe("completed");
  await deleteTask(tasks)({ id: input.id });
  expect(tasks.items).toHaveLength(0);

  const missing = { id: "inexistente" };
  await expect(
    updateTask(
      tasks,
      directory,
      () => later
    )({ ...missing, title: "x", description: "" })
  ).rejects.toThrow(TaskNotFoundError);
  await expect(
    setTaskStatus(
      tasks,
      directory,
      () => later
    )({ ...missing, status: "completed" })
  ).rejects.toThrow(TaskNotFoundError);
  await expect(deleteTask(tasks)(missing)).rejects.toThrow(TaskNotFoundError);
});

test("menções só aceitam contas existentes e voltam resolvidas na leitura", async () => {
  const tasks = new InMemoryTaskRepository();
  const create = createTask({
    tasks,
    users: directory,
    generateId: () => input.id,
    now: () => input.createdAt,
  });
  await expect(
    create({ ...input, mentions: ["user-2", "fantasma"] })
  ).rejects.toThrow(InvalidTaskError);
  expect(tasks.items).toHaveLength(0);

  const created = await create({ ...input, mentions: ["user-3", "user-2"] });
  expect(created.mentions.map((user) => user.id)).toEqual(["user-3", "user-2"]);
  expect(created.mentions[1]).toMatchObject({
    name: "Bruno",
    username: "bruno",
    image: "https://example.test/bruno.png",
  });

  const cleared = await updateTask(
    tasks,
    directory,
    () => later
  )({ id: input.id, title: "Revisar API", description: "", mentions: [] });
  expect(cleared.mentions).toEqual([]);
});

test("a leitura de uma tarefa sem autor conhecido não quebra", async () => {
  const tasks = new InMemoryTaskRepository();
  await tasks.save(
    Task.restore({
      ...Task.create({ ...input, mentions: ["user-2"] }).toJSON(),
      authorId: null,
    })
  );
  const [view] = (await listTasks(tasks, directory)({})).items;
  expect(view?.author).toBeNull();
  expect(view?.mentions.map((user) => user.id)).toEqual(["user-2"]);
});

test("filtra e pagina sobre todas as tarefas, de qualquer autor", async () => {
  const tasks = new InMemoryTaskRepository();
  for (let i = 0; i < 25; i++) {
    await tasks.save(
      Task.create({ ...input, id: `task-${i.toString().padStart(2, "0")}` })
    );
  }
  await tasks.save(Task.create({ ...input, id: "completed" }).complete(later));
  await tasks.save(Task.create({ ...input, id: "other", authorId: "user-2" }));
  const list = listTasks(tasks, directory);
  const first = await list({ status: "pending" });
  const second = await list({ status: "pending", page: 2 });
  expect(first.total).toBe(26);
  expect(first.items).toHaveLength(20);
  expect(second.items).toHaveLength(6);
  expect(
    new Set([...first.items, ...second.items].map((task) => task.id)).size
  ).toBe(26);
  expect(first.items.some((task) => task.authorId === "user-2")).toBe(false);
  expect(second.items.some((task) => task.authorId === "user-2")).toBe(true);
  expect((await list({ status: "completed" })).total).toBe(1);
  await expect(list({ page: -1 })).rejects.toThrow(InvalidTaskError);
});

test("a busca de contas para menção respeita o termo e o limite", async () => {
  const mentionable = listMentionableUsers(directory);
  expect((await mentionable({})).items).toHaveLength(3);
  expect((await mentionable({ search: " bru " })).items).toMatchObject([
    { id: "user-2" },
  ]);
  expect((await mentionable({ search: "carla" })).items).toMatchObject([
    { id: "user-3", username: null },
  ]);
  expect((await mentionable({ search: "ninguém" })).items).toEqual([]);
});

test("o resumo agrega por status e por responsável, sem depender de página", async () => {
  const tasks = new InMemoryTaskRepository();
  const make = (id: string, mentions: string[]) =>
    Task.create({ ...input, id, mentions });
  await tasks.save(make("t1", ["user-2"]));
  await tasks.save(make("t2", ["user-2", "user-3"]).complete(later));
  await tasks.save(make("t3", ["user-3"]));
  await tasks.save(make("t4", []));
  await tasks.save(make("t5", []).complete(later));
  // Conta desconhecida sai do recorte em vez de aparecer sem nome.
  await tasks.save(make("t6", ["removida"]));

  const summary = await summarizeTasks(tasks, directory)();
  expect(summary).toMatchObject({ total: 6, pending: 4, completed: 2 });
  expect(summary.unassigned).toEqual({ pending: 1, completed: 1 });
  expect(
    summary.assignees.map((row) => [row.user.id, row.pending, row.completed])
  ).toEqual([
    ["user-2", 1, 1],
    ["user-3", 1, 1],
  ]);
  expect(summary.assignees[0]?.user.name).toBe("Bruno");
});

test("o resumo de um quadro vazio não quebra as divisões da tela", async () => {
  const summary = await summarizeTasks(
    new InMemoryTaskRepository(),
    directory
  )();
  expect(summary).toEqual({
    total: 0,
    pending: 0,
    completed: 0,
    unassigned: { pending: 0, completed: 0 },
    assignees: [],
  });
});
