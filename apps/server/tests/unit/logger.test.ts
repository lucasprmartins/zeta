import { expect, test } from "bun:test";
import { createLogger, readLogLevel } from "@zeta/logger";

test("valida níveis e aplica o padrão", () => {
  expect(readLogLevel(undefined)).toBe("info");
  expect(readLogLevel(" WARN ")).toBe("warn");
  expect(() => readLogLevel("verbose")).toThrow("LOG_LEVEL");
});

test("gera JSON estruturado e oculta credenciais", () => {
  const lines: string[] = [];
  const logger = createLogger(
    { service: "test", level: "info" },
    { write: (line) => lines.push(line) }
  );

  logger.info(
    {
      password: "senha",
      headers: { authorization: "Bearer segredo", cookie: "session=segredo" },
    },
    "Evento de teste"
  );

  expect(lines).toHaveLength(1);
  const entry = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
  expect(entry).toMatchObject({
    level: 30,
    service: "test",
    msg: "Evento de teste",
    password: "[Redacted]",
    headers: {
      authorization: "[Redacted]",
      cookie: "[Redacted]",
    },
  });
  expect(entry.time).toBeString();
});
