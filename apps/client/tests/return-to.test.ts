import { expect, test } from "bun:test";
import { safeReturnTo } from "../src/lib/return-to";

test("preserva rota, painel, filtros e fragmento depois do login", () => {
  const link =
    "/tasks?status=pending&task=00000000-0000-4000-8000-000000000001#details";
  expect(safeReturnTo(link)).toBe(link);
});

test("rejeita destinos externos e ciclos de autenticação", () => {
  for (const target of [
    undefined,
    {},
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\n/evil.test",
    "javascript:alert(1)",
    "/login?redirect=/tasks",
    "/register",
    "/foo/../login",
  ]) {
    expect(safeReturnTo(target)).toBe("/dashboard");
  }
});
