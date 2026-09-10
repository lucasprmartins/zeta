import { afterAll, beforeAll, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrap } from "@server/bootstrap";
import { createDatabase } from "@server/infrastructure/database/client";
import { migrateDatabase } from "@server/infrastructure/database/migrate";
import { SQL } from "bun";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sql/migrator";

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
  const migrationsFolder = new URL(
    "../../src/infrastructure/database/migrations",
    import.meta.url
  ).pathname;
  const initial = await mkdtemp(join(tmpdir(), "zeta-migration-"));
  try {
    await mkdir(join(initial, "meta"));
    const journal = await Bun.file(
      join(migrationsFolder, "meta/_journal.json")
    ).json();
    await writeFile(
      join(initial, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) })
    );
    await copyFile(
      join(migrationsFolder, `${journal.entries[0].tag}.sql`),
      join(initial, `${journal.entries[0].tag}.sql`)
    );
    await migrate(database.db, { migrationsFolder: initial });
    await database.db.execute(
      sql`insert into auth_user (id, name, email) values ('legacy-owner', 'Legacy', 'legacy@example.com')`
    );
    await database.db.execute(
      sql`insert into projects (id, owner_id, name, created_at) values ('00000000-0000-4000-8000-000000000001', 'legacy-owner', 'Registro preservado', '2026-01-01T00:00:00Z')`
    );
    // Estado imediatamente anterior à separação dos schemas.
    const splitIndex = journal.entries.findIndex(
      (entry: { tag: string }) => entry.tag === "0007_separate_schemas"
    );
    if (splitIndex < 1) {
      throw new Error("Migration de separação dos schemas não encontrada.");
    }
    const previous = journal.entries.slice(0, splitIndex);
    await writeFile(
      join(initial, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: previous })
    );
    for (const entry of previous) {
      await copyFile(
        join(migrationsFolder, `${entry.tag}.sql`),
        join(initial, `${entry.tag}.sql`)
      );
    }
    await migrate(database.db, { migrationsFolder: initial });
    await database.db.execute(
      sql`insert into public.auth_account (id, issuer, account_id, provider_id, user_id, password) values ('schema-account', 'local', 'legacy-owner', 'credential', 'legacy-owner', 'preserved-hash')`
    );
    await database.db.execute(
      sql`insert into public.auth_session (id, user_id, token, expires_at) values ('schema-session', 'legacy-owner', 'preserved-session-token', now() + interval '1 day')`
    );
    await database.db.execute(
      sql`insert into public.auth_verification (id, identifier, value, expires_at) values ('schema-verification', 'migration-fixture', 'preserved-value', now() + interval '1 day')`
    );
    await database.db.execute(
      sql`insert into public.access_role (id, name, grants, protected) values ('schema-role', 'Papel preservado', '["tasks:read"]', false)`
    );
    await database.db.execute(
      sql`insert into public.registration_settings (id, allow_sign_up, require_approval) values ('registration', true, false)`
    );
    await migrateDatabase(database.db, migrationsFolder);
  } finally {
    await rm(initial, { recursive: true, force: true });
  }
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
    name: "Integration User",
    email,
    password: "test-password-long-enough-123",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  expect(cookie).toContain("session_token");
  return { cookie, data: await response.json() };
}

test("migra, autentica, persiste e isola usuários usando a stack real", async () => {
  expect((await request("/ready")).status).toBe(200);
  const first = await signUp("first@example.com");
  const second = await signUp("second@example.com");
  const created = await request(
    "/rpc/tasks/create",
    { json: { title: " Real API ", ownerId: second.data.user.id } },
    first.cookie
  );
  expect(created.status).toBe(200);
  expect((await created.json()).json).toMatchObject({
    title: "Real API",
    ownerId: first.data.user.id,
  });

  const firstList = await request(
    "/rpc/tasks/list",
    { json: null },
    first.cookie
  );
  expect((await firstList.json()).json.items).toHaveLength(1);
  const secondList = await request(
    "/rpc/tasks/list",
    { json: null },
    second.cookie
  );
  expect((await secondList.json()).json.items).toEqual([]);
  expect((await request("/rpc/tasks/list", { json: null })).status).toBe(401);

  const rest = await request(
    "/api/tasks",
    { title: "Tarefa via OpenAPI" },
    first.cookie
  );
  expect(rest.status).toBe(200);
  expect((await rest.json()).ownerId).toBe(first.data.user.id);
  expect(
    await (await request("/api/tasks", undefined, second.cookie)).json()
  ).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  expect((await request("/api/tasks", undefined, first.cookie)).status).toBe(
    200
  );

  const session = await request(
    "/api/auth/get-session",
    undefined,
    first.cookie
  );
  expect((await session.json()).user.id).toBe(first.data.user.id);
  const signIn = await request("/api/auth/sign-in/email", {
    email: "first@example.com",
    password: "test-password-long-enough-123",
  });
  expect(signIn.status).toBe(200);
  expect((await request("/api/auth/sign-out", {}, first.cookie)).status).toBe(
    200
  );
  expect(
    (await request("/rpc/tasks/list", { json: null }, first.cookie)).status
  ).toBe(401);
  expect((await request("/api/tasks", undefined, first.cookie)).status).toBe(
    401
  );
}, 30_000);

test("documentação reúne Better Auth, REST e saúde sem referências quebradas", async () => {
  const response = await request("/openapi/json");
  expect(response.status).toBe(200);
  const spec = await response.json();
  expect(spec.paths["/api/auth/sign-in/email"].post).toBeDefined();
  expect(spec.paths["/api/auth/sign-in/username"].post.tags).toEqual([
    "Acesso",
  ]);
  expect(spec.paths["/api/auth/is-username-available"].post.tags).toEqual([
    "Conta",
  ]);
  expect(spec.paths["/api/auth/sign-up/email"].post).toBeDefined();
  expect(spec.paths["/api/auth/get-session"].get).toBeDefined();
  expect(spec.paths["/api/tasks"].post).toBeDefined();
  for (const match of JSON.stringify(spec).matchAll(/"\$ref":"(#[^"]+)"/g)) {
    const value = match[1]!
      .slice(2)
      .split("/")
      .reduce(
        (current, key) =>
          current?.[key.replaceAll("~1", "/").replaceAll("~0", "~")],
        spec
      );
    expect(value).toBeDefined();
  }
});

test("rejeita uma origem não autorizada no cadastro", async () => {
  const response = await runtime.app.handle(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://untrusted.example",
      },
      body: JSON.stringify({
        name: "Blocked",
        email: "blocked@example.com",
        password: "test-password-long-enough-123",
      }),
    })
  );
  expect(response.status).toBe(403);
});

test("preserva os registros anteriores ao migrar projetos para tarefas", async () => {
  const rows = await database.db.execute(
    sql`select * from tasks where owner_id = 'legacy-owner'`
  );
  expect(rows[0]).toMatchObject({
    title: "Registro preservado",
    status: "pending",
    description: "",
    completed_at: null,
  });
  expect(new Date(rows[0]!.updated_at).toISOString()).toBe(
    "2026-01-01T00:00:00.000Z"
  );
});

test("edita, conclui, filtra, reabre e exclui com isolamento real", async () => {
  const owner = await signUp("tasks-owner@example.com");
  const other = await signUp("tasks-other@example.com");
  const task = await (
    await request(
      "/api/tasks",
      { title: "x".repeat(120), description: "Detalhes" },
      owner.cookie
    )
  ).json();
  expect(task.title).toHaveLength(120);
  const path = `/api/tasks/${task.id}`;
  expect(
    (await request(path, { title: "Intrusão" }, other.cookie, "PATCH")).status
  ).toBe(404);
  expect(
    (
      await request(
        `${path}/status`,
        { status: "completed" },
        other.cookie,
        "PATCH"
      )
    ).status
  ).toBe(404);
  expect((await request(path, undefined, other.cookie, "DELETE")).status).toBe(
    404
  );
  expect(
    (await request(path, { title: " " }, owner.cookie, "PATCH")).status
  ).toBe(400);
  const edit = await request(
    path,
    { title: "Editada", description: "Nova descrição" },
    owner.cookie,
    "PATCH"
  );
  expect(edit.status).toBe(200);
  expect(await edit.json()).toMatchObject({
    title: "Editada",
    description: "Nova descrição",
    status: "pending",
  });
  const completed = await (
    await request(
      `${path}/status`,
      { status: "completed" },
      owner.cookie,
      "PATCH"
    )
  ).json();
  expect(completed.status).toBe("completed");
  expect(completed.completedAt).toBeString();
  expect(
    (
      await (
        await request("/api/tasks?status=pending", undefined, owner.cookie)
      ).json()
    ).total
  ).toBe(0);
  expect(
    (
      await (
        await request(
          "/api/tasks?status=completed&page=1",
          undefined,
          owner.cookie
        )
      ).json()
    ).items
  ).toHaveLength(1);
  expect(
    (await request("/api/tasks?page=-1", undefined, owner.cookie)).status
  ).toBe(400);
  expect(
    (await request("/api/tasks?status=invalid", undefined, owner.cookie)).status
  ).toBe(400);
  const reopened = await request(
    "/rpc/tasks/setStatus",
    { json: { id: task.id, status: "pending" } },
    owner.cookie
  );
  expect((await reopened.json()).json).toMatchObject({
    status: "pending",
    completedAt: null,
  });
  expect((await request(path, undefined, owner.cookie, "DELETE")).status).toBe(
    200
  );
  expect((await request(path, undefined, owner.cookie, "DELETE")).status).toBe(
    404
  );
  expect(
    (await (await request("/api/tasks", undefined, owner.cookie)).json()).total
  ).toBe(0);
}, 30_000);

test("autentica a mesma conta por username e email e valida unicidade", async () => {
  const password = "test-password-long-enough-123";
  const signup = await request("/api/auth/sign-up/email", {
    name: "Username User",
    email: "username@example.com",
    username: "Example.User_1",
    password,
  });
  expect(signup.status).toBe(200);
  const registered = await signup.json();
  expect(registered.user).toMatchObject({
    username: "example.user_1",
    displayUsername: "Example.User_1",
  });

  for (const [path, credentials] of [
    ["/api/auth/sign-in/username", { username: "EXAMPLE.USER_1", password }],
    ["/api/auth/sign-in/email", { email: "username@example.com", password }],
  ] as const) {
    const login = await request(path, credentials);
    expect(login.status).toBe(200);
    const cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("session_token");
    expect((await login.json()).user.id).toBe(registered.user.id);
    const session = await (
      await request("/api/auth/get-session", undefined, cookie)
    ).json();
    expect(session.user).toMatchObject({
      id: registered.user.id,
      username: "example.user_1",
    });
    expect((await request("/api/tasks", undefined, cookie)).status).toBe(200);
    await request("/api/auth/sign-out", {}, cookie);
    expect((await request("/api/tasks", undefined, cookie)).status).toBe(401);
  }
  for (const username of ["example.user_1", "EXAMPLE.USER_1"]) {
    const duplicate = await request("/api/auth/sign-up/email", {
      name: "Duplicate",
      email: "duplicate-username@example.com",
      username,
      password,
    });
    expect(duplicate.status).toBe(400);
    expect((await duplicate.json()).code).toBe("USERNAME_IS_ALREADY_TAKEN");
  }
  for (const username of [
    "ab",
    "x".repeat(31),
    "has space",
    "email@example.com",
    "usuário",
  ]) {
    const invalid = await request("/api/auth/sign-up/email", {
      name: "Invalid",
      email: "invalid-username@example.com",
      username,
      password,
    });
    expect(invalid.status).toBe(400);
  }
  const wrongPassword = await request("/api/auth/sign-in/username", {
    username: "example.user_1",
    password: "wrong-password",
  });
  expect(wrongPassword.status).toBe(401);
  expect((await wrongPassword.json()).code).toBe(
    "INVALID_USERNAME_OR_PASSWORD"
  );
  expect(wrongPassword.headers.getSetCookie()).toHaveLength(0);
  const missing = await request("/api/auth/sign-in/username", {
    username: "unknown.user",
    password,
  });
  expect(missing.status).toBe(401);
  expect((await missing.json()).code).toBe("INVALID_USERNAME_OR_PASSWORD");
  const availability = await request("/api/auth/is-username-available", {
    username: "EXAMPLE.USER_1",
  });
  expect(await availability.json()).toEqual({ available: false });
}, 30_000);

test("contas sem username continuam válidas e podem definir um pelo Better Auth", async () => {
  const legacy = await database.db.execute(
    sql`select username, display_username from auth.user where id = 'legacy-owner'`
  );
  expect(legacy[0]).toMatchObject({ username: null, display_username: null });
  const existing = await signUp("email-only@example.com");
  const update = await request(
    "/api/auth/update-user",
    { username: "Email.Only" },
    existing.cookie
  );
  expect(update.status).toBe(200);
  const login = await request("/api/auth/sign-in/username", {
    username: "email.only",
    password: "test-password-long-enough-123",
  });
  expect(login.status).toBe(200);
  expect((await login.json()).user.id).toBe(existing.data.user.id);
  const unauthorized = await request("/api/auth/update-user", {
    username: "no.session",
  });
  expect(unauthorized.status).toBe(401);
});

test("perfil atualiza nome e senha da sessão, revogando outros acessos", async () => {
  const email = "profile-edit@example.com";
  const oldPassword = "test-password-long-enough-123";
  const newPassword = "new-profile-password-456";
  const first = await signUp(email);
  const other = await request("/api/auth/sign-in/email", {
    email,
    password: oldPassword,
  });
  const otherCookie = other.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  expect(other.status).toBe(200);
  expect(
    (await request("/api/auth/update-user", { name: "Nome atualizado" })).status
  ).toBe(401);
  expect(
    (
      await request(
        "/api/auth/update-user",
        { name: "Nome atualizado" },
        first.cookie
      )
    ).status
  ).toBe(200);
  const profile = await (
    await request("/api/auth/get-session", undefined, first.cookie)
  ).json();
  expect(profile.user).toMatchObject({
    id: first.data.user.id,
    email,
    name: "Nome atualizado",
  });
  expect(
    (
      await request("/api/auth/change-password", {
        currentPassword: oldPassword,
        newPassword,
      })
    ).status
  ).toBe(401);
  const invalid = await request(
    "/api/auth/change-password",
    { currentPassword: "incorrect-password", newPassword },
    first.cookie
  );
  expect(invalid.status).toBe(400);
  expect((await invalid.json()).code).toBe("INVALID_PASSWORD");
  const change = await request(
    "/api/auth/change-password",
    { currentPassword: oldPassword, newPassword, revokeOtherSessions: true },
    first.cookie
  );
  expect(change.status).toBe(200);
  const renewedCookie = change.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  expect((await request("/api/tasks", undefined, renewedCookie)).status).toBe(
    200
  );
  expect((await request("/api/tasks", undefined, otherCookie)).status).toBe(
    401
  );
  expect(
    (await request("/api/auth/sign-in/email", { email, password: oldPassword }))
      .status
  ).toBe(401);
  expect(
    (await request("/api/auth/sign-in/email", { email, password: newPassword }))
      .status
  ).toBe(200);
}, 30_000);

test("perfil altera username, rejeita duplicados e permite login com o novo identificador", async () => {
  const first = await signUp("profile-username@example.com");
  const second = await signUp("profile-username-other@example.com");
  expect(
    (
      await request(
        "/api/auth/update-user",
        { username: "profile.before", displayUsername: "profile.before" },
        first.cookie
      )
    ).status
  ).toBe(200);
  expect(
    (
      await request(
        "/api/auth/update-user",
        { username: "profile.taken" },
        second.cookie
      )
    ).status
  ).toBe(200);
  const duplicate = await request(
    "/api/auth/update-user",
    { username: "profile.taken" },
    first.cookie
  );
  expect(duplicate.status).toBe(400);
  expect((await duplicate.json()).code).toBe("USERNAME_IS_ALREADY_TAKEN");
  expect(
    (
      await request(
        "/api/auth/update-user",
        { username: "invalid username" },
        first.cookie
      )
    ).status
  ).toBe(400);
  expect(
    (
      await request(
        "/api/auth/update-user",
        {
          name: "Profile Updated",
          username: "Profile.After",
          displayUsername: "Profile.After",
        },
        first.cookie
      )
    ).status
  ).toBe(200);
  const session = await (
    await request("/api/auth/get-session", undefined, first.cookie)
  ).json();
  expect(session.user).toMatchObject({
    id: first.data.user.id,
    email: "profile-username@example.com",
    name: "Profile Updated",
    username: "profile.after",
    displayUsername: "Profile.After",
  });
  const password = "test-password-long-enough-123";
  expect(
    (
      await request("/api/auth/sign-in/username", {
        username: "profile.before",
        password,
      })
    ).status
  ).toBe(401);
  expect(
    (
      await request("/api/auth/sign-in/username", {
        username: "profile.after",
        password,
      })
    ).status
  ).toBe(200);
  const other = await (
    await request("/api/auth/get-session", undefined, second.cookie)
  ).json();
  expect(other.user.username).toBe("profile.taken");
}, 30_000);

test("papéis não podem ser forjados e alterações valem em sessões existentes", async () => {
  const first = await signUp("roles-owner@example.com");
  const second = await signUp("roles-other@example.com");
  const adminAccount = await signUp("roles-admin@example.com");
  expect(first.data.user.role).toBe("user");
  const legacy = await database.db.execute(
    sql`select role from auth.user where id = 'legacy-owner'`
  );
  expect(legacy[0]?.role).toBe("user");

  const forged = await request("/api/auth/sign-up/email", {
    name: "Forged",
    email: "roles-forged@example.com",
    password: "test-password-long-enough-123",
    role: "admin",
  });
  expect(forged.status).toBe(400);
  await request("/api/auth/update-user", { role: "admin" }, first.cookie);
  expect(
    (
      await (
        await request("/api/auth/get-session", undefined, first.cookie)
      ).json()
    ).user.role
  ).toBe("user");
  expect(
    (
      await request(
        "/api/auth/admin/set-role",
        { userId: first.data.user.id, role: "admin" },
        first.cookie
      )
    ).status
  ).toBe(403);

  // Promoção restrita ao fixture: nenhuma conta real recebe privilégios.
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${adminAccount.data.user.id}`
  );
  expect(
    (
      await request(
        "/api/auth/admin/set-role",
        { userId: first.data.user.id, role: "admin" },
        adminAccount.cookie
      )
    ).status
  ).toBe(403);
  expect(
    (
      await request(
        `/api/access/users/${first.data.user.id}/role`,
        { roleId: "admin" },
        adminAccount.cookie,
        "PATCH"
      )
    ).status
  ).toBe(200);
  expect(
    (
      await (
        await request("/api/auth/get-session", undefined, first.cookie)
      ).json()
    ).user.role
  ).toBe("admin");
  const created = await request(
    "/api/tasks",
    { title: "Private task" },
    second.cookie
  );
  const task = await created.json();
  expect(created.status).toBe(200);
  expect(
    (
      await request(
        `/api/tasks/${task.id}`,
        { title: "Forbidden owner" },
        first.cookie,
        "PATCH"
      )
    ).status
  ).toBe(404);
  const listed = await (
    await request("/api/tasks", undefined, first.cookie)
  ).json();
  expect(listed.items).toEqual([]);
  expect(
    (
      await request(
        "/api/auth/admin/impersonate-user",
        { userId: second.data.user.id },
        first.cookie
      )
    ).status
  ).toBe(403);

  expect(
    (
      await request(
        `/api/access/users/${first.data.user.id}/role`,
        { roleId: "user" },
        adminAccount.cookie,
        "PATCH"
      )
    ).status
  ).toBe(200);
  expect(
    (
      await request(
        "/api/auth/admin/set-role",
        { userId: second.data.user.id, role: "admin" },
        first.cookie
      )
    ).status
  ).toBe(403);
  await database.db.execute(
    sql`update auth.user set role = 'unconfigured' where id = ${first.data.user.id}`
  );
  expect((await request("/api/tasks", undefined, first.cookie)).status).toBe(
    403
  );
  expect(
    (await request("/api/tasks", { title: "Denied" }, first.cookie)).status
  ).toBe(403);
}, 30_000);

test("painel cria papéis dinâmicos, revoga concessões e protege a administração", async () => {
  const manager = await signUp("dynamic-admin@example.com");
  const operator = await signUp("dynamic-operator@example.com");
  const outsider = await signUp("dynamic-outsider@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.data.user.id}`
  );
  const save = (body: unknown, cookie = manager.cookie) =>
    request("/api/access/roles", body, cookie);
  const assign = (userId: string, roleId: string) =>
    request(
      `/api/access/users/${userId}/role`,
      { roleId },
      manager.cookie,
      "PATCH"
    );
  expect((await request("/api/access/roles")).status).toBe(401);
  expect(
    (await request("/api/access/roles", undefined, operator.cookie)).status
  ).toBe(403);
  expect(
    (await save({ name: "Forged", grants: ["tasks:read"] }, operator.cookie))
      .status
  ).toBe(403);
  expect(
    (await save({ name: "Escalation", grants: ["access:manage"] })).status
  ).toBe(400);
  expect(
    (await save({ name: "Unknown", grants: ["tasks:everything"] })).status
  ).toBe(400);
  const editedAdmin = await save({
    id: "admin",
    name: "Administrador",
    color: "#AABBCC",
    grants: [],
  });
  expect(editedAdmin.status).toBe(200);
  expect(await editedAdmin.json()).toMatchObject({
    color: "#aabbcc",
    protected: true,
  });
  const adminAccess = await (
    await request("/api/access/me", undefined, manager.cookie)
  ).json();
  expect(adminAccess.grants).toContain("tasks:create");
  expect(adminAccess.grants).toContain("access:manage");
  expect(
    (
      await request(
        "/api/tasks",
        { title: "Admin continua com acesso total" },
        manager.cookie
      )
    ).status
  ).toBe(200);

  expect(
    (await save({ name: "Bad color", grants: [], color: "red" })).status
  ).toBe(400);
  expect(
    (
      await request(
        "/api/access/roles/user",
        undefined,
        manager.cookie,
        "DELETE"
      )
    ).status
  ).toBe(403);
  const created = await save({
    name: "Operador",
    grants: ["tasks:read", "tasks:create"],
  });
  expect(created.status).toBe(200);
  const role = await created.json();
  expect(role.protected).toBe(false);
  expect((await save({ name: "operador", grants: [] })).status).toBe(409);
  expect((await assign(operator.data.user.id, role.id)).status).toBe(200);
  expect((await assign(outsider.data.user.id, "missing-role")).status).toBe(
    404
  );
  expect(
    (
      await request(
        `/api/access/roles/${role.id}`,
        undefined,
        manager.cookie,
        "DELETE"
      )
    ).status
  ).toBe(409);
  const me = await (
    await request("/api/access/me", undefined, operator.cookie)
  ).json();
  expect(me).toMatchObject({
    roleId: role.id,
    grants: ["tasks:create", "tasks:read"],
  });
  expect(
    (await request("/api/tasks", { title: "Operador" }, operator.cookie)).status
  ).toBe(200);
  const ownTask = (
    await (await request("/api/tasks", undefined, operator.cookie)).json()
  ).items[0];
  expect(
    (
      await request(
        `/api/tasks/${ownTask.id}`,
        { title: "Sem edição" },
        operator.cookie,
        "PATCH"
      )
    ).status
  ).toBe(403);
  expect(
    (await request("/api/access/users", undefined, operator.cookie)).status
  ).toBe(403);
  expect(
    (await request("/api/auth/admin/list-users", undefined, operator.cookie))
      .status
  ).toBe(403);
  expect(
    (
      await request(
        "/api/auth/admin/ban-user",
        { userId: manager.data.user.id },
        manager.cookie
      )
    ).status
  ).toBe(403);
  expect(
    (await save({ id: role.id, name: "Operador", grants: ["tasks:read"] }))
      .status
  ).toBe(200);
  // A mesma sessão e o mesmo papel perdem a ação imediatamente na API.
  expect(
    (await request("/api/tasks", { title: "Revogado" }, operator.cookie)).status
  ).toBe(403);
  expect(
    (await (await request("/api/access/me", undefined, operator.cookie)).json())
      .grants
  ).toEqual(["tasks:read"]);
  expect(
    (await (await request("/api/tasks", undefined, outsider.cookie)).json())
      .items
  ).toEqual([]);
  expect((await assign(operator.data.user.id, "user")).status).toBe(200);
  expect(
    (
      await request(
        `/api/access/roles/${role.id}`,
        undefined,
        manager.cookie,
        "DELETE"
      )
    ).status
  ).toBe(200);
  expect((await assign(operator.data.user.id, role.id)).status).toBe(404);
  const users = await (
    await request(
      "/api/access/users?search=dynamic-operator%40example.com",
      undefined,
      manager.cookie
    )
  ).json();
  expect(users.items).toHaveLength(1);
  expect(users.items[0]).toMatchObject({
    id: operator.data.user.id,
    role: "user",
  });
  // Metadados da UI são publicados junto aos papéis, sem dados de contas para usuários comuns.
  const roles = await (
    await request("/api/access/roles", undefined, manager.cookie)
  ).json();
  expect(roles.catalog[0].actions[0].id).toBe("tasks:read");
}, 30_000);

test("mutações concorrentes não removem o último administrador", async () => {
  const first = await signUp("last-admin-first@example.com");
  const second = await signUp("last-admin-second@example.com");
  // Escopo isolado desta suíte: remove admins dos fixtures anteriores.
  await database.db.execute(
    sql`update auth.user set role = 'user' where role = 'admin'`
  );
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id in (${first.data.user.id}, ${second.data.user.id})`
  );
  const outcomes = await Promise.all([
    request(
      `/api/access/users/${first.data.user.id}/role`,
      { roleId: "user" },
      first.cookie,
      "PATCH"
    ),
    request(
      `/api/access/users/${second.data.user.id}/role`,
      { roleId: "user" },
      second.cookie,
      "PATCH"
    ),
  ]);
  expect(outcomes.map((response) => response.status).sort()).toEqual([
    200, 409,
  ]);
  const remaining = await database.db.execute(
    sql`select id from auth.user where role = 'admin' and banned = false`
  );
  expect(remaining).toHaveLength(1);
  const account = remaining[0]!.id === first.data.user.id ? first : second;
  const demoted = remaining[0]!.id === first.data.user.id ? second : first;
  expect(
    (
      await request(
        `/api/access/users/${account.data.user.id}/role`,
        { roleId: "user" },
        account.cookie,
        "PATCH"
      )
    ).status
  ).toBe(409);
  expect(
    (
      await request(
        "/api/access/roles",
        { name: "No access", grants: [] },
        demoted.cookie
      )
    ).status
  ).toBe(403);
}, 30_000);

test("persiste cores e pagina usuários em grupos contíguos por papel", async () => {
  const manager = await signUp("groups-admin@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.data.user.id}`
  );
  const groupA = await (
    await request(
      "/api/access/roles",
      { name: "000 Grupo A", color: "#123ABC", grants: ["tasks:read"] },
      manager.cookie
    )
  ).json();
  const groupB = await (
    await request(
      "/api/access/roles",
      { name: "001 Grupo B", color: "#CC5500", grants: [] },
      manager.cookie
    )
  ).json();
  expect(groupA.color).toBe("#123abc");
  for (let i = 0; i < 23; i++) {
    const id = `group-fixture-${i}`;
    const role = i < 12 ? groupA.id : groupB.id;
    // Nomes em ordem inversa comprovam que o papel precede o nome da conta.
    await database.db.execute(
      sql`insert into auth.user (id, name, email, role) values (${id}, ${i < 12 ? "Zeta" : "Alpha"}, ${`${id}@example.com`}, ${role})`
    );
  }
  const page1 = await (
    await request("/api/access/users?page=1", undefined, manager.cookie)
  ).json();
  const page2 = await (
    await request("/api/access/users?page=2", undefined, manager.cookie)
  ).json();
  expect(page1.items).toHaveLength(20);
  expect(
    page1.items
      .slice(0, 12)
      .every((user: { role: string }) => user.role === groupA.id)
  ).toBe(true);
  expect(
    page1.items
      .slice(12)
      .every((user: { role: string }) => user.role === groupB.id)
  ).toBe(true);
  expect(
    page2.items
      .slice(0, 3)
      .every((user: { role: string }) => user.role === groupB.id)
  ).toBe(true);
  expect(
    new Set(
      [...page1.items, ...page2.items].map((user: { id: string }) => user.id)
    ).size
  ).toBe(page1.items.length + page2.items.length);
  const filtered = await (
    await request(
      "/api/access/users?search=group-fixture&page=2",
      undefined,
      manager.cookie
    )
  ).json();
  expect(filtered.items).toHaveLength(3);
  expect(filtered.hasMore).toBe(false);
  expect(
    filtered.items.every((item: { email: string }) =>
      item.email.includes("group-fixture")
    )
  ).toBe(true);
  const changed = await request(
    "/api/access/roles",
    {
      id: groupA.id,
      name: "000 Grupo editado",
      color: "#00AA11",
      grants: ["tasks:create"],
    },
    manager.cookie
  );
  expect(changed.status).toBe(200);
  const listing = await (
    await request("/api/access/roles", undefined, manager.cookie)
  ).json();
  expect(
    listing.roles.find((role: { id: string }) => role.id === groupA.id)
  ).toMatchObject({
    name: "000 Grupo editado",
    color: "#00aa11",
    grants: ["tasks:create"],
  });
  expect(
    listing.roles.find((role: { id: string }) => role.id === "user").color
  ).toBe("#737373");
}, 30_000);

test("admin gerencia contas atomicamente e filtra contas por nome, nome de usuário e e-mail", async () => {
  const manager = await signUp("accounts-admin@example.com");
  const outsider = await signUp("accounts-outsider@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'user' where role = 'admin'`
  );
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.data.user.id}`
  );
  const fields = {
    name: "Conta gerenciada",
    username: "managed.account",
    email: "managed@example.com",
    password: "initial-password-123",
    roleId: "user",
  };
  const create = (body: unknown, cookie = manager.cookie) =>
    request("/api/access/users", body, cookie);
  expect((await request("/api/access/users", fields)).status).toBe(401);
  expect((await create(fields, outsider.cookie)).status).toBe(403);
  for (const path of ["create-user", "update-user", "set-user-password"]) {
    expect(
      (await request(`/api/auth/admin/${path}`, fields, manager.cookie)).status
    ).toBe(404);
  }
  const role = await (
    await request(
      "/api/access/roles",
      { name: "Contas gerenciadas", grants: ["tasks:read"] },
      manager.cookie
    )
  ).json();
  const custom = await create({
    ...fields,
    username: "other.managed",
    email: "other-managed@example.com",
    roleId: role.id,
  });
  expect(custom.status).toBe(200);
  expect((await custom.json()).role).toBe(role.id);
  const created = await create(fields);
  expect(created.status).toBe(200);
  const account = await created.json();
  expect(account).toMatchObject({
    name: fields.name,
    username: fields.username,
    email: fields.email,
    role: "user",
  });
  expect(account.password).toBeUndefined();
  const login = (username: string, password: string) =>
    request("/api/auth/sign-in/username", { username, password });
  const signed = await login(fields.username, fields.password);
  expect(signed.status).toBe(200);
  const cookie = signed.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const lookup = (identifier: string, actor = manager.cookie) =>
    request(
      `/api/access/users?search=${encodeURIComponent(identifier)}`,
      undefined,
      actor
    );
  expect((await lookup("MANAGED.ACCOUNT")).status).toBe(200);
  expect((await lookup("MANAGED@EXAMPLE.COM")).status).toBe(200);
  for (const identifier of [
    "managed",
    "CONTA GERENCI",
    "MANAGED.ACC",
    "MANAGED@EXAMPLE",
  ]) {
    const result = await (await lookup(identifier)).json();
    expect(
      result.items.some((item: { id: string }) => item.id === account.id)
    ).toBe(true);
  }
  for (const identifier of ["inexistente123", "%", "_no-match_", "\\"]) {
    expect((await (await lookup(identifier)).json()).items).toEqual([]);
  }
  expect((await lookup(fields.username, outsider.cookie)).status).toBe(403);
  const update = (body: unknown) =>
    request(`/api/access/users/${account.id}`, body, manager.cookie, "PATCH");
  // Dados válidos não são parcialmente salvos quando o username conflita.
  expect(
    (await create({ ...fields, email: "different@example.com" })).status
  ).toBe(409);
  expect(
    (
      await update({
        ...fields,
        email: outsider.data.user.email,
        name: "Não salvar",
      })
    ).status
  ).toBe(409);
  expect(
    (await update({ ...fields, name: "Não salvar", password: "short" })).status
  ).toBe(400);
  expect(
    (await update({ ...fields, username: "other.managed", name: "Não salvar" }))
      .status
  ).toBe(409);
  expect((await (await lookup(fields.username)).json()).items[0].name).toBe(
    fields.name
  );
  // Sem nova senha, mantém credencial e sessão, mesmo com username inalterado.
  const { password: _, ...withoutPassword } = fields;
  expect(
    (await update({ ...withoutPassword, name: "Atualizado" })).status
  ).toBe(200);
  expect((await request("/api/access/me", undefined, cookie)).status).toBe(200);
  const changed = {
    ...fields,
    name: "Novo nome",
    username: "new.account",
    email: "new-managed@example.com",
    password: "replacement-password-123",
  };
  expect((await update(changed)).status).toBe(200);
  expect((await request("/api/access/me", undefined, cookie)).status).toBe(401);
  expect((await login(fields.username, fields.password)).status).not.toBe(200);
  expect((await login(changed.username, changed.password)).status).toBe(200);
  expect(
    (
      await request("/api/auth/sign-in/email", {
        email: changed.email,
        password: changed.password,
      })
    ).status
  ).toBe(200);
  expect(
    (await (await lookup(fields.email)).json()).items.some(
      (item: { email: string }) => item.email === fields.email
    )
  ).toBe(false);
  expect((await (await lookup(changed.username)).json()).items[0].name).toBe(
    changed.name
  );
  // Falha tardia na atribuição reverte também senha, dados e revogação de sessões.
  const demotion = await request(
    `/api/access/users/${manager.data.user.id}`,
    {
      name: "Não salvar",
      username: "rollback.admin",
      email: manager.data.user.email,
      password: "replacement-password-123",
      roleId: "user",
    },
    manager.cookie,
    "PATCH"
  );
  expect(demotion.status).toBe(409);
  expect(
    (await request("/api/access/me", undefined, manager.cookie)).status
  ).toBe(200);
  expect((await (await lookup("rollback.admin")).json()).items).toEqual([]);
  expect(
    (
      await request("/api/auth/sign-in/email", {
        email: manager.data.user.email,
        password: "test-password-long-enough-123",
      })
    ).status
  ).toBe(200);
}, 30_000);

test("console separa cadastro público e aprovação, bloqueando sessões pendentes", async () => {
  const manager = await signUp("console-admin@example.com");
  const existing = await signUp("console-existing@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.data.user.id}`
  );
  const policyPath = "/api/access/registration";
  const configure = (allowSignUp: boolean, requireApproval: boolean) =>
    request(
      policyPath,
      { allowSignUp, requireApproval },
      manager.cookie,
      "PUT"
    );
  const publicPolicy = () => request("/api/registration-policy");
  expect(await (await publicPolicy()).json()).toEqual({
    allowSignUp: true,
    requireApproval: false,
  });
  expect((await request(policyPath)).status).toBe(401);
  expect((await request(policyPath, undefined, existing.cookie)).status).toBe(
    403
  );
  expect(
    (
      await request(
        policyPath,
        { allowSignUp: false, requireApproval: false },
        existing.cookie,
        "PUT"
      )
    ).status
  ).toBe(403);
  expect(
    (
      await request(
        policyPath,
        { allowSignUp: "false", requireApproval: false },
        manager.cookie,
        "PUT"
      )
    ).status
  ).toBe(400);
  const signup = (email: string, username: string) =>
    request("/api/auth/sign-up/email", {
      email,
      username,
      name: "Aguardando aprovação",
      password: "test-password-long-enough-123",
      approvalPending: false,
    });
  for (const requireApproval of [false, true]) {
    expect((await configure(false, requireApproval)).status).toBe(200);
    expect(await (await publicPolicy()).json()).toEqual({
      allowSignUp: false,
      requireApproval,
    });
    const blocked = await signup(
      `closed-${requireApproval}@example.com`,
      `closed.${requireApproval}`
    );
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
  }
  expect(
    (await request("/api/access/me", undefined, existing.cookie)).status
  ).toBe(200);
  // O administrador continua criando contas aprovadas mesmo com cadastro fechado.
  const createdByAdmin = await request(
    "/api/access/users",
    {
      name: "Convidado",
      username: "admin.invited",
      email: "admin-invited@example.com",
      password: "test-password-long-enough-123",
      roleId: "user",
    },
    manager.cookie
  );
  expect(createdByAdmin.status).toBe(200);
  expect(
    (
      await request("/api/auth/sign-in/username", {
        username: "admin.invited",
        password: "test-password-long-enough-123",
      })
    ).status
  ).toBe(200);
  expect((await configure(true, true)).status).toBe(200);
  const pending = await signup(
    "pending-console@example.com",
    "pending.console"
  );
  expect(pending.status).toBe(200);
  expect(pending.headers.getSetCookie().join()).not.toContain("session_token");
  const body = await pending.json();
  expect(body.token).toBeNull();
  expect(body.user.approvalPending).toBe(true);
  const login = () =>
    request("/api/auth/sign-in/email", {
      email: "pending-console@example.com",
      password: "test-password-long-enough-123",
    });
  const denied = await login();
  expect(denied.status).toBe(403);
  expect((await denied.json()).code).toBe("ACCOUNT_PENDING_APPROVAL");
  expect(
    (
      await request("/api/auth/sign-in/username", {
        username: "pending.console",
        password: "test-password-long-enough-123",
      })
    ).status
  ).toBe(403);
  expect(
    await database.db.execute(
      sql`select id from auth.session where user_id = ${body.user.id}`
    )
  ).toHaveLength(0);
  expect(
    (await request("/api/access/approvals", undefined, existing.cookie)).status
  ).toBe(403);
  expect(
    (
      await (
        await request("/api/access/approvals", undefined, manager.cookie)
      ).json()
    ).items.map((user: { id: string }) => user.id)
  ).toContain(body.user.id);
  expect(
    (
      await (
        await request(
          "/api/access/users?search=pending.console",
          undefined,
          manager.cookie
        )
      ).json()
    ).items
  ).toEqual([]);
  const approvePath = `/api/access/approvals/${body.user.id}`;
  expect((await request(approvePath, {}, existing.cookie)).status).toBe(403);
  expect((await request(approvePath, {})).status).toBe(401);
  // Desativar a exigência não libera quem já aguardava aprovação.
  expect((await configure(true, false)).status).toBe(200);
  expect((await login()).status).toBe(403);
  const status = await (
    await request(policyPath, undefined, manager.cookie)
  ).json();
  expect(status).toMatchObject({ requireApproval: false, pendingCount: 1 });
  const immediate = await signup(
    "immediate-console@example.com",
    "immediate.console"
  );
  expect(immediate.status).toBe(200);
  expect((await immediate.json()).token).toBeString();
  expect((await request(approvePath, {}, manager.cookie)).status).toBe(200);
  expect((await request(approvePath, {}, manager.cookie)).status).toBe(404);
  const accepted = await login();
  expect(accepted.status).toBe(200);
  const cookie = accepted.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  expect((await request("/api/tasks", undefined, cookie)).status).toBe(200);
  expect(
    (await (await request(policyPath, undefined, manager.cookie)).json())
      .pendingCount
  ).toBe(0);
  expect(
    (
      await (
        await request(
          "/api/access/users?search=pending.console",
          undefined,
          manager.cookie
        )
      ).json()
    ).items
  ).toHaveLength(1);
}, 30_000);

test("separa schemas preservando registros, constraints e histórico de migrations", async () => {
  const tables = await database.db.execute(
    sql`select table_schema, table_name from information_schema.tables where table_schema in ('auth', 'console', 'public', 'drizzle') and table_type = 'BASE TABLE' order by table_schema, table_name`
  );
  expect(tables.map((row) => `${row.table_schema}.${row.table_name}`)).toEqual([
    "auth.access",
    "auth.account",
    "auth.session",
    "auth.user",
    "auth.verification",
    "console.registration",
    "drizzle.migrations",
    "public.guides",
    "public.tasks",
  ]);
  expect(
    (
      await database.db.execute(
        sql`select password from auth.account where id = 'schema-account'`
      )
    )[0]!.password
  ).toBe("preserved-hash");
  expect(
    (
      await database.db.execute(
        sql`select token from auth.session where id = 'schema-session'`
      )
    )[0]!.token
  ).toBe("preserved-session-token");
  expect(
    (
      await database.db.execute(
        sql`select value from auth.verification where id = 'schema-verification'`
      )
    )[0]!.value
  ).toBe("preserved-value");
  expect(
    (
      await database.db.execute(
        sql`select grants from auth.access where id = 'schema-role'`
      )
    )[0]!.grants
  ).toEqual(["tasks:read"]);
  expect(
    await database.db.execute(
      sql`select id from console.registration where id = 'registration'`
    )
  ).toHaveLength(1);
  const references = await database.db.execute(
    sql`select confrelid::regclass::text as target from pg_constraint where conname = 'tasks_owner_id_user_id_fk'`
  );
  expect(references[0]!.target).toBe('auth."user"');
  const journal = await Bun.file(
    new URL(
      "../../src/infrastructure/database/migrations/meta/_journal.json",
      import.meta.url
    )
  ).json();
  expect(
    await database.db.execute(sql`select id from drizzle.migrations`)
  ).toHaveLength(journal.entries.length);
});

test("migrador preserva o histórico renomeado e não reaplica migrations", async () => {
  const before = await database.db.execute(
    sql`select id, hash, created_at from drizzle.migrations order by id`
  );
  await migrateDatabase(database.db);
  expect(
    await database.db.execute(
      sql`select id, hash, created_at from drizzle.migrations order by id`
    )
  ).toEqual(before);
  expect(
    (
      await database.db.execute(
        sql`select to_regclass('drizzle.__drizzle_migrations') as legacy`
      )
    )[0]!.legacy
  ).toBeNull();
  await database.db.execute(
    sql`create table drizzle.__drizzle_migrations (id integer)`
  );
  try {
    await expect(migrateDatabase(database.db)).rejects.toThrow(
      "Existem dois históricos"
    );
    expect(
      await database.db.execute(
        sql`select id, hash, created_at from drizzle.migrations order by id`
      )
    ).toEqual(before);
  } finally {
    await database.db.execute(sql`drop table drizzle.__drizzle_migrations`);
  }
});

test("banco novo cria apenas drizzle.migrations e serializa migradores concorrentes", async () => {
  const freshName = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const freshUrl = new URL(url!);
  freshUrl.pathname = `/${freshName}`;
  const fresh = createDatabase(freshUrl.toString());
  await admin.unsafe(`CREATE DATABASE "${freshName}"`);
  try {
    await Promise.all([migrateDatabase(fresh.db), migrateDatabase(fresh.db)]);
    const journal = await Bun.file(
      new URL(
        "../../src/infrastructure/database/migrations/meta/_journal.json",
        import.meta.url
      )
    ).json();
    expect(
      await fresh.db.execute(sql`select id from drizzle.migrations`)
    ).toHaveLength(journal.entries.length);
    expect(
      (
        await fresh.db.execute(
          sql`select to_regclass('drizzle.__drizzle_migrations') as legacy`
        )
      )[0]!.legacy
    ).toBeNull();
  } finally {
    await fresh.close();
    await admin.unsafe(`DROP DATABASE "${freshName}"`);
  }
});

test("guias separam publicação e rascunho, autorização, importação e paginação", async () => {
  const manager = await signUp("guides-admin@example.com");
  const reader = await signUp("guides-reader@example.com");
  await database.db.execute(
    sql`update auth.user set role = 'admin' where id = ${manager.data.user.id}`
  );
  const draft = {
    title: "Primeiro guia",
    section: "Guias",
    order: 1,
    markdown: "# Guia\n\nConteúdo publicado",
    permission: null,
  };
  const save = (body: unknown, cookie = manager.cookie) =>
    request("/api/admin/guides", body, cookie);
  const read = (slug = "primeiro-guia") =>
    request(`/api/guides/${slug}`, undefined, reader.cookie);
  expect((await request("/api/guides")).status).toBe(401);
  expect(
    (await request("/api/admin/guides", undefined, reader.cookie)).status
  ).toBe(403);
  expect(
    (
      await save(
        { slug: "primeiro-guia", draft, action: "publish" },
        reader.cookie
      )
    ).status
  ).toBe(403);
  const pending = await save({ slug: "primeiro-guia", draft, action: "draft" });
  expect(pending.status).toBe(200);
  expect((await read()).status).toBe(404);
  expect(
    (await (await request("/api/guides", undefined, reader.cookie)).json())
      .items
  ).toEqual([]);
  expect(
    (
      await save({
        slug: "primeiro-guia",
        draft,
        action: "publish",
        version: 1,
      })
    ).status
  ).toBe(200);
  const changed = {
    ...draft,
    title: "Título secreto do rascunho",
    markdown: "Ainda não publicado",
  };
  expect(
    (
      await save({
        slug: "primeiro-guia",
        draft: changed,
        action: "draft",
        version: 2,
      })
    ).status
  ).toBe(200);
  expect((await (await read()).json()).markdown).toBe(draft.markdown);
  expect(
    JSON.stringify(
      await (await request("/api/guides", undefined, reader.cookie)).json()
    )
  ).not.toContain("secreto");
  expect(
    (
      await save({
        slug: "primeiro-guia",
        draft,
        action: "publish",
        version: 2,
      })
    ).status
  ).toBe(409);
  expect(
    (
      await save({
        slug: "primeiro-guia",
        draft: { ...draft, markdown: "![image](url)" },
        action: "publish",
        version: 3,
      })
    ).status
  ).toBe(400);
  const noRead = await (
    await request(
      "/api/access/roles",
      { name: "Sem leitura dos guias restritos", grants: [] },
      manager.cookie
    )
  ).json();
  expect(
    (
      await request(
        `/api/access/users/${reader.data.user.id}/role`,
        { roleId: noRead.id },
        manager.cookie,
        "PATCH"
      )
    ).status
  ).toBe(200);
  expect((await read()).status).toBe(200);
  for (let i = 0; i < 25; i++) {
    expect(
      (
        await save({
          slug: `restrito-${i}`,
          draft: { ...draft, order: 0, permission: "tasks:read" },
          action: "publish",
        })
      ).status
    ).toBe(200);
  }
  expect((await read("restrito-1")).status).toBe(404);
  const stored = await database.db.execute(
    sql`select jsonb_typeof(published) as kind from guides where slug = 'restrito-1'`
  );
  expect(stored[0]?.kind).toBe("object");
  const visible = await (
    await request("/api/guides", undefined, reader.cookie)
  ).json();
  expect(visible.items).toHaveLength(1);
  expect(visible.hasMore).toBe(false);
  const adminFirst = await (
    await request("/api/guides", undefined, manager.cookie)
  ).json();
  const adminNext = await (
    await request("/api/guides?page=2", undefined, manager.cookie)
  ).json();
  expect(adminFirst.items).toHaveLength(20);
  expect(adminFirst.hasMore).toBe(true);
  expect(adminNext.items).toHaveLength(6);
  expect(
    (
      await save({
        slug: "primeiro-guia",
        draft,
        action: "unpublish",
        version: 3,
      })
    ).status
  ).toBe(200);
  expect((await read()).status).toBe(404);
  // A mesma política vale no transporte RPC.
  expect(
    (
      await request(
        "/rpc/guides/adminGet",
        { json: { slug: "primeiro-guia" } },
        reader.cookie
      )
    ).status
  ).toBe(403);
  const script = new URL("../../scripts/import-guides.ts", import.meta.url)
    .pathname;
  const cwd = new URL("../..", import.meta.url).pathname;
  const runImport = () =>
    Bun.spawn([process.execPath, script], {
      cwd,
      env: { ...process.env, DATABASE_URL: scopedUrl.toString() },
      stdout: "pipe",
      stderr: "pipe",
    });
  const imported = runImport();
  expect(await imported.exited).toBe(0);
  expect(await new Response(imported.stdout).text()).toContain(
    "Rascunho criado"
  );
  const before = await (
    await request(
      "/api/admin/guides/primeiros-passos",
      undefined,
      manager.cookie
    )
  ).json();
  expect(before.published).toBeNull();
  expect(
    (
      await save({
        slug: "primeiros-passos",
        draft: { ...before.draft, title: "Edição no painel" },
        version: before.version,
        action: "draft",
      })
    ).status
  ).toBe(200);
  const repeated = runImport();
  expect(await repeated.exited).toBe(0);
  expect(await new Response(repeated.stdout).text()).toContain(
    "Existente preservado"
  );
  const after = await (
    await request(
      "/api/admin/guides/primeiros-passos",
      undefined,
      manager.cookie
    )
  ).json();
  expect(after.draft.title).toBe("Edição no painel");
}, 30_000);
