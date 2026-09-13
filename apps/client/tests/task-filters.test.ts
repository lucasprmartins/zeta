import { expect, test } from "bun:test";
import {
  emptyTaskCriteria,
  hasTaskCriteria,
  taskCriteria,
} from "../src/features/tasks/task-filters";

test("normaliza os filtros da URL sem interpretar valores arbitrários", () => {
  expect(
    taskCriteria({
      q: "  API  ",
      assignees: ["b", "a", "a", 1],
      unassigned: true,
      status: "completed",
    })
  ).toEqual({
    q: "API",
    assignees: ["a", "b"],
    unassigned: true,
    status: "completed",
  });
  expect(
    taskCriteria({
      q: 42,
      assignees: "all",
      unassigned: "true",
      status: "unknown",
    })
  ).toEqual(emptyTaskCriteria);
  expect(taskCriteria({ q: "a".repeat(130) }).q.length).toBe(120);
  expect(hasTaskCriteria(emptyTaskCriteria)).toBe(false);
  expect(hasTaskCriteria({ ...emptyTaskCriteria, unassigned: true })).toBe(
    true
  );
});
