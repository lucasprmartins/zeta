import { expect, test } from "bun:test";
import { listTaskAssignees } from "@server/domain/tasks/application/list-task-assignees";
import { listTasks } from "@server/domain/tasks/application/list-tasks";
import { validateTaskFilters } from "@server/domain/tasks/application/task-list-filters";
import { Task } from "@server/domain/tasks/entities/task";
import {
  InMemoryTaskRepository,
  InMemoryUserDirectory,
} from "../helpers/in-memory-task-repository";

test("combina busca e status com qualquer responsável ou ausência antes de paginar", async () => {
  const repo = new InMemoryTaskRepository();
  for (let i = 0; i < 25; i++) {
    await repo.save(
      Task.create({
        id: `t${i}`,
        authorId: "author",
        description: "",
        title: `Revisar API ${i}`,
        createdAt: "2026-09-12T12:00:00Z",
        mentions: i % 2 ? ["a", "b"] : [],
      })
    );
  }
  await repo.save(
    Task.create({
      id: "other",
      authorId: "author",
      description: "",
      title: "Outro assunto",
      createdAt: "2026-09-12T12:00:00Z",
      mentions: ["c"],
    })
  );
  const list = listTasks(repo, new InMemoryUserDirectory());
  expect(
    await list({
      search: " revisar API ",
      assignees: ["a", "b"],
      unassigned: true,
    })
  ).toMatchObject({ total: 25, hasMore: true });
  expect((await list({ search: "API", assignees: ["a", "b"] })).total).toBe(12);
  expect((await list({ unassigned: true })).total).toBe(13);
  expect(
    (await list({ search: "API", assignees: ["a"], status: "completed" })).total
  ).toBe(0);
  expect(
    (
      await list({
        search: "API",
        assignees: ["a", "b"],
        unassigned: true,
        page: 2,
      })
    ).items
  ).toHaveLength(5);
});

test("normaliza critérios e rejeita limites e tipos inválidos", () => {
  expect(
    validateTaskFilters({ search: "  API ", assignees: ["b", "a", "a"] })
  ).toEqual({ search: "API", assignees: ["a", "b"] });
  expect(() => validateTaskFilters({ search: "x".repeat(121) })).toThrow();
  expect(() =>
    validateTaskFilters({
      assignees: Array.from({ length: 21 }, (_, i) => String(i)),
    })
  ).toThrow();
  expect(() => validateTaskFilters({ assignees: [""] })).toThrow();
});

test("opções incluem somente pessoas presentes em tarefas e preservam selecionados", async () => {
  const repo = new InMemoryTaskRepository();
  repo.people.push(
    { id: "a", name: "Ana", username: "ana", image: null },
    { id: "b", name: "Bruno", username: null, image: null },
    { id: "c", name: "Carla", username: null, image: null }
  );
  await repo.save(
    Task.create({
      id: "task",
      authorId: "c",
      description: "",
      title: "API",
      createdAt: "2026-09-12T12:00:00Z",
      mentions: ["a", "b"],
    })
  );
  const list = listTaskAssignees(repo);
  expect(
    (await list({ search: "ana" })).items.map((person) => person.id)
  ).toEqual(["a"]);
  expect(
    (await list({ search: "ana", selected: ["b", "c"] })).items.map(
      (person) => person.id
    )
  ).toEqual(["b", "a"]);
});
