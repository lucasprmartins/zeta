import { expect, test } from "bun:test";
import { can, permissions } from "../src/lib/access";

test("verifica concessões recebidas do servidor, sem presumir nomes de papéis", () => {
  expect(can(["tasks:read"], permissions.tasks.read)).toBe(true);
  expect(can(["tasks:read"], permissions.tasks.create)).toBe(false);
  expect(can([], permissions.access.manage)).toBe(false);
  expect(can(["access:manage"], permissions.access.manage)).toBe(true);
  expect(can(undefined, permissions.tasks.read)).toBe(false);
  expect(can(["tasks:read"], [])).toBe(false);
  expect(can(["tasks:read"], ["tasks:read", "tasks:create"])).toBe(false);
});
