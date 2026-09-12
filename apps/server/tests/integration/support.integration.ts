import { afterAll, beforeAll, expect, test } from "bun:test";
import { bootstrap } from "@server/bootstrap";
import {
  type SupportTicket,
  supportService,
} from "@server/domain/support/support";
import { createDatabase } from "@server/infrastructure/database/client";
import { migrateDatabase } from "@server/infrastructure/database/migrate";
import { createSupportSettings } from "@server/infrastructure/repositories/drizzle-support-settings";
import { SQL } from "bun";
import { sql } from "drizzle-orm";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "Defina TEST_DATABASE_URL para executar testes de integração."
  );
}

const databaseName = `test_${crypto.randomUUID().replaceAll("-", "")}`;
const admin = new SQL(url);
const scopedUrl = new URL(url);
scopedUrl.pathname = `/${databaseName}`;
const database = createDatabase(scopedUrl.toString());
const secret = "integration-only-secret-with-more-than-32-characters";
const runtime = await bootstrap({
  databaseUrl: scopedUrl.toString(),
  authUrl: "http://localhost:3000",
  authSecret: secret,
  logLevel: "silent",
  port: 3000,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
});

beforeAll(async () => {
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  await migrateDatabase(database.db);
}, 30_000);

afterAll(async () => {
  await runtime.closeDatabase();
  await database.close();
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await admin.close();
  }
});

function request(
  path: string,
  body?: unknown,
  cookie?: string,
  method = body === undefined ? "GET" : "POST"
) {
  return runtime.app.handle(
    new Request(`http://localhost:3000${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3001",
        ...(cookie ? { cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
}

async function signUp(email: string) {
  const response = await request("/api/auth/sign-up/email", {
    name: "Support Integration User",
    email,
    password: "test-password-long-enough-123",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  expect(cookie).toContain("session_token");
  const data: { user: { id: string } } = await response.json();
  return { cookie, id: data.user.id };
}

test("suporte cifra a configuração e preserva ou remove credenciais explicitamente", async () => {
  const manager = await signUp("support-admin@example.com");
  const reader = await signUp("support-reader@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.id}`
  );
  const settings = createSupportSettings(database.db, secret);
  const webhookUrl = "https://8.8.8.8/webhook?key=integration-secret";
  const token = "integration-only-webhook-token";
  const sourceName = "Cliente de integração";
  const configure = (body: unknown, cookie = manager.cookie) =>
    request("/api/admin/support", body, cookie, "PUT");
  const status = () => request("/api/support/status", undefined, reader.cookie);

  expect((await request("/api/support/status")).status).toBe(401);
  expect(await (await status()).json()).toEqual({ configured: false });
  expect(
    (await request("/api/admin/support", { webhookUrl }, undefined, "PUT"))
      .status
  ).toBe(401);
  expect((await configure({ webhookUrl }, reader.cookie)).status).toBe(403);
  expect(await settings.get()).toBeNull();
  const saved = await configure({ webhookUrl, token, sourceName });
  expect(saved.status).toBe(200);
  expect(await saved.json()).toEqual({ configured: true });
  expect(await (await status()).json()).toEqual({ configured: true });

  const rows = await database.db.execute<{ encrypted_configuration: string }>(
    sql`select encrypted_configuration from console.support where id = 'webhook'`
  );
  expect(rows).toHaveLength(1);
  const encrypted = rows[0]?.encrypted_configuration;
  expect(encrypted).toBeString();
  expect(encrypted).not.toContain(token);
  expect(encrypted).not.toContain(webhookUrl);
  expect(encrypted).not.toContain(sourceName);
  expect(await settings.get()).toEqual({ webhookUrl, token, sourceName });

  const replacementUrl = "https://8.8.8.8/new-webhook";
  expect(
    (await configure({ webhookUrl: replacementUrl, sourceName })).status
  ).toBe(200);
  expect(await settings.get()).toEqual({
    webhookUrl: replacementUrl,
    token,
    sourceName,
  });
  expect(
    (await configure({ webhookUrl: replacementUrl, sourceName, token: null }))
      .status
  ).toBe(200);
  expect((await settings.get())?.token).toBeNull();
  expect((await configure({ webhookUrl: null })).status).toBe(200);
  expect(await settings.get()).toBeNull();
  expect(await (await status()).json()).toEqual({ configured: false });
});

test("configuração de suporte revalida o ator na transação", async () => {
  const manager = await signUp("support-revalidation@example.com");
  const settings = createSupportSettings(database.db, secret);
  const configuration = {
    webhookUrl: "https://8.8.8.8/revalidation",
    token: "integration-revalidation-token",
    sourceName: "Revalidação",
  };
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.id}`
  );
  await settings.save(manager.id, configuration);
  await database.db.execute(
    sql`update auth.user set role = 'user' where id = ${manager.id}`
  );
  await expect(settings.save(manager.id, { webhookUrl: null })).rejects.toThrow(
    "permissão"
  );
  expect(
    (
      await request(
        "/api/admin/support",
        { webhookUrl: null },
        manager.cookie,
        "PUT"
      )
    ).status
  ).toBe(403);
  expect(await settings.get()).toEqual(configuration);
  await database.db.execute(
    sql`update auth.user set role = 'admin', banned = true where id = ${manager.id}`
  );
  await expect(settings.save(manager.id, { webhookUrl: null })).rejects.toThrow(
    "permissão"
  );
  expect(await settings.get()).toEqual(configuration);
  await database.db.execute(
    sql`update auth.user set banned = false, approval_pending = true where id = ${manager.id}`
  );
  await expect(settings.save(manager.id, { webhookUrl: null })).rejects.toThrow(
    "permissão"
  );
  expect(await settings.get()).toEqual(configuration);
});

test("envio usa identidade persistida e recusa contas bloqueadas", async () => {
  const manager = await signUp("support-delivery-admin@example.com");
  const requester = await signUp("support-delivery-reader@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.id}`
  );
  const settings = createSupportSettings(database.db, secret);
  await settings.save(manager.id, {
    webhookUrl: "https://8.8.8.8/never-called",
    sourceName: "Sistema de integração",
  });
  const delivered: SupportTicket[] = [];
  const service = supportService(
    settings,
    {
      validateUrl: () => Promise.resolve(),
      send: (_configuration, ticket) => {
        delivered.push(ticket);
        return Promise.resolve();
      },
    },
    {
      origin: "http://localhost:3000",
      now: () => new Date("2026-09-11T12:00:00.000Z"),
      id: () => crypto.randomUUID(),
    }
  );
  const input = {
    requestId: crypto.randomUUID(),
    subject: "Não consigo salvar",
    description: "O formulário informa um erro ao salvar.",
    type: "error" as const,
    priority: "normal" as const,
    attachments: [],
    pageUrl: "/tasks",
  };
  const result = await service.submit(requester.id, input);
  expect(delivered).toHaveLength(1);
  expect(delivered[0]).toMatchObject({
    ticketId: result.ticketId,
    requestedAt: "2026-09-11T12:00:00.000Z",
    requester: {
      id: requester.id,
      email: "support-delivery-reader@example.com",
      name: "Support Integration User",
    },
    source: {
      name: "Sistema de integração",
      origin: "http://localhost:3000",
      pageUrl: "http://localhost:3000/tasks",
    },
  });
  await database.db.execute(
    sql`update auth.user set banned = true where id = ${requester.id}`
  );
  await expect(service.submit(requester.id, input)).rejects.toThrow("conta");
  expect(delivered).toHaveLength(1);
});
