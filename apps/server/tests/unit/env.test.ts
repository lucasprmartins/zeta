import { expect, test } from "bun:test";
import { readEnv } from "@server/config/env";

const valid = {
  DATABASE_URL: "postgresql://app:app@localhost:5432/app",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
};

test("carrega configuração e porta padrão", () => {
  expect(readEnv(valid).port).toBe(3000);
});

test("rejeita configuração incompleta, segredo fraco e porta inválida", () => {
  expect(() => readEnv({})).toThrow("DATABASE_URL");
  expect(() => readEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(
    "BETTER_AUTH_SECRET"
  );
  expect(() => readEnv({ ...valid, PORT: "0" })).toThrow("PORT");
  expect(() =>
    readEnv({ ...valid, DATABASE_URL: "https://example.com" })
  ).toThrow("PostgreSQL");
});

test("aceita apenas origens explícitas para o frontend", () => {
  expect(
    readEnv({
      ...valid,
      TRUSTED_ORIGINS: "http://localhost:3001, https://app.example.com",
    }).trustedOrigins
  ).toEqual(["http://localhost:3001", "https://app.example.com"]);
  expect(readEnv(valid).trustedOrigins).toEqual(["http://localhost:3000"]);
  expect(() => readEnv({ ...valid, TRUSTED_ORIGINS: "*" })).toThrow();
  expect(() =>
    readEnv({ ...valid, TRUSTED_ORIGINS: "https://example.com/path" })
  ).toThrow("TRUSTED_ORIGINS");
});
