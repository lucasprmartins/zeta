import { mkdtemp, mkdir, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { SQL } from "bun";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { bootstrap } from "@server/bootstrap";
import { createDatabase } from "@server/infrastructure/database/client";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Defina TEST_DATABASE_URL para executar testes de integração.");

const databaseName = `test_${crypto.randomUUID().replaceAll("-", "")}`;
const admin = new SQL(url);
const scopedUrl = new URL(url);
scopedUrl.pathname = `/${databaseName}`;
const database = createDatabase(scopedUrl.toString());
const runtime = await bootstrap({
  databaseUrl: scopedUrl.toString(),
  authUrl: "http://localhost:3000",
  authSecret: "integration-only-secret-with-more-than-32-characters",
  port: 3000,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
});

beforeAll(async () => {
  // Identificadores gerados internamente, nunca recebidos de entrada externa.
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  const migrationsFolder = new URL("../../src/infrastructure/database/migrations", import.meta.url).pathname;
  const initial = await mkdtemp(join(tmpdir(), "zeta-migration-"));
  try {
    await mkdir(join(initial, "meta"));
    const journal = await Bun.file(join(migrationsFolder, "meta/_journal.json")).json();
    await writeFile(join(initial, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }));
    await copyFile(join(migrationsFolder, `${journal.entries[0].tag}.sql`), join(initial, `${journal.entries[0].tag}.sql`));
    await migrate(database.db, { migrationsFolder: initial });
    await database.db.execute(sql`insert into auth_user (id, name, email) values ('legacy-owner', 'Legacy', 'legacy@example.com')`);
    await database.db.execute(sql`insert into projects (id, owner_id, name, created_at) values ('00000000-0000-4000-8000-000000000001', 'legacy-owner', 'Registro preservado', '2026-01-01T00:00:00Z')`);
    await migrate(database.db, { migrationsFolder });
  } finally { await rm(initial, { recursive: true, force: true }); }
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

function request(path: string, body?: unknown, cookie?: string, method = body === undefined ? "GET" : "POST") {
  return runtime.app.handle(new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3001",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

async function signUp(email: string) {
  const response = await request("/api/auth/sign-up/email", {
    name: "Integration User", email, password: "test-password-long-enough-123",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  expect(cookie).toContain("session_token");
  return { cookie, data: await response.json() };
}

test("migra, autentica, persiste e isola usuários usando a stack real", async () => {
  expect((await request("/ready")).status).toBe(200);
  const first = await signUp("first@example.com");
  const second = await signUp("second@example.com");
  const created = await request("/rpc/tasks/create", { json: { title: " Real API ", ownerId: second.data.user.id } }, first.cookie);
  expect(created.status).toBe(200);
  expect((await created.json()).json).toMatchObject({ title: "Real API", ownerId: first.data.user.id });

  const firstList = await request("/rpc/tasks/list", { json: null }, first.cookie);
  expect((await firstList.json()).json.items).toHaveLength(1);
  const secondList = await request("/rpc/tasks/list", { json: null }, second.cookie);
  expect((await secondList.json()).json.items).toEqual([]);
  expect((await request("/rpc/tasks/list", { json: null })).status).toBe(401);

  const rest = await request("/api/tasks", { title: "Tarefa via OpenAPI" }, first.cookie);
  expect(rest.status).toBe(200);
  expect((await rest.json()).ownerId).toBe(first.data.user.id);
  expect(await (await request("/api/tasks", undefined, second.cookie)).json()).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  expect((await request("/api/tasks", undefined, first.cookie)).status).toBe(200);

  const session = await request("/api/auth/get-session", undefined, first.cookie);
  expect((await session.json()).user.id).toBe(first.data.user.id);
  const signIn = await request("/api/auth/sign-in/email", { email: "first@example.com", password: "test-password-long-enough-123" });
  expect(signIn.status).toBe(200);
  expect((await request("/api/auth/sign-out", {}, first.cookie)).status).toBe(200);
  expect((await request("/rpc/tasks/list", { json: null }, first.cookie)).status).toBe(401);
  expect((await request("/api/tasks", undefined, first.cookie)).status).toBe(401);
}, 30_000);

test("documentação reúne Better Auth, REST e saúde sem referências quebradas", async () => {
  const response = await request("/openapi/json");
  expect(response.status).toBe(200);
  const spec = await response.json();
  expect(spec.paths["/api/auth/sign-in/email"].post).toBeDefined();
  expect(spec.paths["/api/auth/sign-in/username"].post.tags).toEqual(["Acesso"]);
  expect(spec.paths["/api/auth/is-username-available"].post.tags).toEqual(["Conta"]);
  expect(spec.paths["/api/auth/sign-up/email"].post).toBeDefined();
  expect(spec.paths["/api/auth/get-session"].get).toBeDefined();
  expect(spec.paths["/api/tasks"].post).toBeDefined();
  for (const match of JSON.stringify(spec).matchAll(/"\$ref":"(#[^"]+)"/g)) {
    const value = match[1]!.slice(2).split("/").reduce((current, key) => current?.[key.replaceAll("~1", "/").replaceAll("~0", "~")], spec);
    expect(value).toBeDefined();
  }
});

test("rejeita uma origem não autorizada no cadastro", async () => {
  const response = await runtime.app.handle(new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://untrusted.example" },
    body: JSON.stringify({ name: "Blocked", email: "blocked@example.com", password: "test-password-long-enough-123" }),
  }));
  expect(response.status).toBe(403);
});


test("preserva os registros anteriores ao migrar projetos para tarefas", async () => {
  const rows = await database.db.execute(sql`select * from tasks where owner_id = 'legacy-owner'`);
  expect(rows[0]).toMatchObject({ title: "Registro preservado", status: "pending", description: "", completed_at: null });
  expect(new Date(rows[0]!.updated_at).toISOString()).toBe("2026-01-01T00:00:00.000Z");
});

test("edita, conclui, filtra, reabre e exclui com isolamento real", async () => {
  const owner = await signUp("tasks-owner@example.com");
  const other = await signUp("tasks-other@example.com");
  const task = await (await request("/api/tasks", { title: "x".repeat(120), description: "Detalhes" }, owner.cookie)).json();
  expect(task.title).toHaveLength(120);
  const path = `/api/tasks/${task.id}`;
  expect((await request(path, { title: "Intrusão" }, other.cookie, "PATCH")).status).toBe(404);
  expect((await request(`${path}/status`, { status: "completed" }, other.cookie, "PATCH")).status).toBe(404);
  expect((await request(path, undefined, other.cookie, "DELETE")).status).toBe(404);
  expect((await request(path, { title: " " }, owner.cookie, "PATCH")).status).toBe(400);
  const edit = await request(path, { title: "Editada", description: "Nova descrição" }, owner.cookie, "PATCH");
  expect(edit.status).toBe(200);
  expect(await edit.json()).toMatchObject({ title: "Editada", description: "Nova descrição", status: "pending" });
  const completed = await (await request(`${path}/status`, { status: "completed" }, owner.cookie, "PATCH")).json();
  expect(completed.status).toBe("completed");
  expect(completed.completedAt).toBeString();
  expect((await (await request("/api/tasks?status=pending", undefined, owner.cookie)).json()).total).toBe(0);
  expect((await (await request("/api/tasks?status=completed&page=1", undefined, owner.cookie)).json()).items).toHaveLength(1);
  expect((await request("/api/tasks?page=-1", undefined, owner.cookie)).status).toBe(400);
  expect((await request("/api/tasks?status=invalid", undefined, owner.cookie)).status).toBe(400);
  const reopened = await request("/rpc/tasks/setStatus", { json: { id: task.id, status: "pending" } }, owner.cookie);
  expect((await reopened.json()).json).toMatchObject({ status: "pending", completedAt: null });
  expect((await request(path, undefined, owner.cookie, "DELETE")).status).toBe(200);
  expect((await request(path, undefined, owner.cookie, "DELETE")).status).toBe(404);
  expect((await (await request("/api/tasks", undefined, owner.cookie)).json()).total).toBe(0);
}, 30000);

test("autentica a mesma conta por username e email e valida unicidade", async () => {
  const password = "test-password-long-enough-123";
  const signup = await request("/api/auth/sign-up/email", {
    name: "Username User", email: "username@example.com", username: "Example.User_1", password,
  });
  expect(signup.status).toBe(200);
  const registered = await signup.json();
  expect(registered.user).toMatchObject({ username: "example.user_1", displayUsername: "Example.User_1" });

  for (const [path, credentials] of [
    ["/api/auth/sign-in/username", { username: "EXAMPLE.USER_1", password }],
    ["/api/auth/sign-in/email", { email: "username@example.com", password }],
  ] as const) {
    const login = await request(path, credentials);
    expect(login.status).toBe(200);
    const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    expect(cookie).toContain("session_token");
    expect((await login.json()).user.id).toBe(registered.user.id);
    const session = await (await request("/api/auth/get-session", undefined, cookie)).json();
    expect(session.user).toMatchObject({ id: registered.user.id, username: "example.user_1" });
    expect((await request("/api/tasks", undefined, cookie)).status).toBe(200);
    await request("/api/auth/sign-out", {}, cookie);
    expect((await request("/api/tasks", undefined, cookie)).status).toBe(401);
  }
  for (const username of ["example.user_1", "EXAMPLE.USER_1"]) {
    const duplicate = await request("/api/auth/sign-up/email", { name: "Duplicate", email: "duplicate-username@example.com", username, password });
    expect(duplicate.status).toBe(400);
    expect((await duplicate.json()).code).toBe("USERNAME_IS_ALREADY_TAKEN");
  }
  for (const username of ["ab", "x".repeat(31), "has space", "email@example.com", "usuário"]) {
    const invalid = await request("/api/auth/sign-up/email", { name: "Invalid", email: "invalid-username@example.com", username, password });
    expect(invalid.status).toBe(400);
  }
  const wrongPassword = await request("/api/auth/sign-in/username", { username: "example.user_1", password: "wrong-password" });
  expect(wrongPassword.status).toBe(401);
  expect((await wrongPassword.json()).code).toBe("INVALID_USERNAME_OR_PASSWORD");
  expect(wrongPassword.headers.getSetCookie()).toHaveLength(0);
  const missing = await request("/api/auth/sign-in/username", { username: "unknown.user", password });
  expect(missing.status).toBe(401);
  expect((await missing.json()).code).toBe("INVALID_USERNAME_OR_PASSWORD");
  const availability = await request("/api/auth/is-username-available", { username: "EXAMPLE.USER_1" });
  expect(await availability.json()).toEqual({ available: false });
}, 30000);

test("contas sem username continuam válidas e podem definir um pelo Better Auth", async () => {
  const legacy = await database.db.execute(sql`select username, display_username from auth_user where id = 'legacy-owner'`);
  expect(legacy[0]).toMatchObject({ username: null, display_username: null });
  const existing = await signUp("email-only@example.com");
  const update = await request("/api/auth/update-user", { username: "Email.Only" }, existing.cookie);
  expect(update.status).toBe(200);
  const login = await request("/api/auth/sign-in/username", { username: "email.only", password: "test-password-long-enough-123" });
  expect(login.status).toBe(200);
  expect((await login.json()).user.id).toBe(existing.data.user.id);
  const unauthorized = await request("/api/auth/update-user", { username: "no.session" });
  expect(unauthorized.status).toBe(401);
});
