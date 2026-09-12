import { expect, test } from "bun:test";
import {
  supportAttachmentsError,
  supportPagePath,
} from "../src/features/support/request-fields";

const origin = "https://sistema.exemplo.com";
test("página do ticket aceita caminho ou URL local removendo query e fragmento", () => {
  expect(supportPagePath("", origin)).toBeUndefined();
  expect(supportPagePath("/tasks?token=segredo#detalhe", origin)).toBe(
    "/tasks"
  );
  expect(supportPagePath(`${origin}/help?q=segredo`, origin)).toBe("/help");
  expect(
    supportPagePath("https://usuario:senha@sistema.exemplo.com/tasks", origin)
  ).toBe("/tasks");
});
test("página do ticket rejeita outras origens e protocolos", () => {
  for (const value of [
    "https://outro.exemplo.com/tasks",
    "//outro.exemplo.com",
    "javascript:alert(1)",
    "https://sistema.exemplo.com:123/tasks",
  ]) {
    expect(() => supportPagePath(value, origin)).toThrow("deste sistema");
  }
});
test("anexos respeitam contagem, limite individual e total", () => {
  const mb = 1024 * 1024;
  expect(supportAttachmentsError([])).toBeNull();
  expect(
    supportAttachmentsError([{ size: 2 * mb }, { size: 2 * mb }, { size: mb }])
  ).toBeNull();
  expect(supportAttachmentsError([{ size: 2 * mb + 1 }])).not.toBeNull();
  expect(
    supportAttachmentsError(Array.from({ length: 4 }, () => ({ size: 1 })))
  ).not.toBeNull();
  expect(
    supportAttachmentsError(Array.from({ length: 3 }, () => ({ size: 2 * mb })))
  ).not.toBeNull();
});
