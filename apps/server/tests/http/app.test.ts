import { describe, expect, test } from "bun:test";
import { createTask } from "@server/domain/tasks/application/create-task";
import { deleteTask } from "@server/domain/tasks/application/delete-task";
import { listMentionableUsers } from "@server/domain/tasks/application/list-mentionable-users";
import { listTasks } from "@server/domain/tasks/application/list-tasks";
import { setTaskStatus } from "@server/domain/tasks/application/set-task-status";
import { updateTask } from "@server/domain/tasks/application/update-task";
import { createApp } from "@server/interfaces/http/app";
import { createRouter } from "@server/interfaces/http/rpc/router";
import {
  InMemoryTaskRepository,
  InMemoryUserDirectory,
} from "../helpers/in-memory-task-repository";

async function setup(
  options: { databaseDown?: boolean; failSave?: boolean; role?: string } = {}
) {
  const tasks = new InMemoryTaskRepository();
  const directory = new InMemoryUserDirectory([
    { id: "user-1", name: "Ana", username: "ana" },
    { id: "user-2", name: "Bruno", username: "bruno" },
  ]);
  if (options.failSave) {
    tasks.save = async () => {
      throw new Error("sensitive database detail");
    };
  }
  const app = await createApp({
    router: createRouter({
      create: createTask({
        tasks,
        users: directory,
        generateId: () => crypto.randomUUID(),
        now: () => new Date().toISOString(),
      }),
      list: listTasks(tasks, directory),
      update: updateTask(tasks, directory, () => new Date().toISOString()),
      setStatus: setTaskStatus(tasks, directory, () =>
        new Date().toISOString()
      ),
      delete: deleteTask(tasks),
      mentionableUsers: listMentionableUsers(directory),
    }),
    authentication: {
      handle: async (request) => Response.json({ body: await request.json() }),
      resolveUser: async (headers) => {
        const id = headers.get("x-test-user");
        return id
          ? {
              id,
              role: options.role ?? "user",
              grants:
                options.role === "unknown"
                  ? []
                  : [
                      "tasks:read",
                      "tasks:create",
                      "tasks:update",
                      "tasks:set-status",
                      "tasks:delete",
                      ...(options.role === "no-mention"
                        ? []
                        : ["tasks:mention"]),
                    ],
            }
          : null;
      },
    },
    checkDatabase: async () => {
      if (options.databaseDown) {
        throw new Error("db down");
      }
    },
    reportError: () => {
      // Silencia o relatório de erros durante os testes.
    },
  });
  const rpc = (procedure: string, input?: unknown, user?: string) =>
    app.handle(
      new Request(`http://localhost/rpc/tasks/${procedure}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(user ? { "x-test-user": user } : {}),
        },
        body: JSON.stringify({ json: input ?? null }),
      })
    );
  return { app, tasks, rpc };
}

describe("HTTP e RPC", () => {
  test("health não depende do banco; readiness sinaliza indisponibilidade", async () => {
    const { app } = await setup({ databaseDown: true });
    expect(
      (await app.handle(new Request("http://localhost/health"))).status
    ).toBe(200);
    expect(
      (await app.handle(new Request("http://localhost/ready"))).status
    ).toBe(503);
  });

  test("encaminha o corpo bruto ao handler de autenticação", async () => {
    const { app } = await setup();
    const response = await app.handle(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })
    );
    expect(await response.json()).toEqual({
      body: { email: "test@example.com" },
    });
  });

  test("rejeita chamadas sem sessão", async () => {
    const { rpc, tasks } = await setup();
    expect((await rpc("create", { title: "API" })).status).toBe(401);
    expect((await rpc("list")).status).toBe(401);
    expect(tasks.items).toHaveLength(0);
  });

  test("nega todos os endpoints de tarefas sem permissão, inclusive REST", async () => {
    const { rpc, app, tasks } = await setup({ role: "unknown" });
    const id = "00000000-0000-4000-8000-000000000001";
    for (const [operation, input] of [
      ["list", {}],
      ["create", { title: "Denied" }],
      ["update", { id, title: "Denied" }],
      ["setStatus", { id, status: "completed" }],
      ["delete", { id }],
      ["mentionableUsers", {}],
    ] as const) {
      expect((await rpc(operation, input, "user-1")).status).toBe(403);
    }
    expect(
      (
        await app.handle(
          new Request("http://localhost/api/tasks", {
            headers: { "x-test-user": "user-1" },
          })
        )
      ).status
    ).toBe(403);
    expect(tasks.items).toHaveLength(0);
  });

  test("valida entradas em runtime e regras do domínio", async () => {
    const { rpc, tasks } = await setup();
    for (const input of [
      null,
      {},
      { title: 12 },
      { title: " " },
      { title: "x".repeat(121) },
    ]) {
      expect((await rpc("create", input, "user-1")).status).toBe(400);
    }
    expect(tasks.items).toHaveLength(0);
  });

  test("registra o autor da sessão e expõe a tarefa a todas as contas", async () => {
    const { rpc, tasks } = await setup();
    const response = await rpc(
      "create",
      { title: " API ", authorId: "user-2" },
      "user-1"
    );
    expect(response.status).toBe(200);
    // A autoria vem da sessão, nunca do corpo enviado pelo navegador.
    expect(tasks.items[0]?.toJSON()).toMatchObject({
      title: "API",
      authorId: "user-1",
    });
    const created = (await response.json()).json;
    expect(created.author).toMatchObject({ id: "user-1", name: "Ana" });

    // Outra conta enxerga a mesma tarefa e pode concluí-la.
    const others = await (await rpc("list", undefined, "user-2")).json();
    expect(others.json.items).toHaveLength(1);
    expect(others.json.total).toBe(1);
    expect(
      (
        await rpc(
          "setStatus",
          { id: created.id, status: "completed" },
          "user-2"
        )
      ).status
    ).toBe(200);
    expect(tasks.items[0]?.toJSON().status).toBe("completed");
  });

  test("mencionar exige permissão própria e só aceita contas existentes", async () => {
    const { rpc, tasks } = await setup();
    expect(
      (
        await rpc(
          "create",
          { title: "Com menção", mentions: ["fantasma"] },
          "user-1"
        )
      ).status
    ).toBe(400);
    expect(tasks.items).toHaveLength(0);

    const response = await rpc(
      "create",
      { title: "Com menção", mentions: ["user-2"] },
      "user-1"
    );
    expect(response.status).toBe(200);
    expect((await response.json()).json.mentions).toMatchObject([
      { id: "user-2", name: "Bruno" },
    ]);
    expect(
      (
        await (
          await rpc("mentionableUsers", { search: "bru" }, "user-1")
        ).json()
      ).json.items
    ).toMatchObject([{ id: "user-2" }]);
  });

  test("sem tasks:mention a conta cria tarefas, mas não menciona nem busca contas", async () => {
    const { rpc, tasks } = await setup({ role: "no-mention" });
    expect((await rpc("create", { title: "Sozinha" }, "user-1")).status).toBe(
      200
    );
    expect(tasks.items).toHaveLength(1);
    expect(
      (
        await rpc(
          "create",
          { title: "Barrada", mentions: ["user-2"] },
          "user-1"
        )
      ).status
    ).toBe(403);
    expect((await rpc("mentionableUsers", {}, "user-1")).status).toBe(403);
    expect(tasks.items).toHaveLength(1);
  });

  test("retorna erro interno sem expor detalhes de persistência", async () => {
    const { rpc } = await setup({ failSave: true });
    const response = await rpc("create", { title: "API" }, "user-1");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("sensitive database detail");
  });

  test("retorna 404 para rotas e procedures desconhecidas", async () => {
    const { app, rpc } = await setup();
    expect(
      (await app.handle(new Request("http://localhost/missing"))).status
    ).toBe(404);
    expect((await rpc("missing", {}, "user-1")).status).toBe(404);
  });

  test("publica Scalar e schemas concretos dos endpoints HTTP", async () => {
    const { app } = await setup();
    const html = await app.handle(new Request("http://localhost/openapi"));
    expect(html.status).toBe(200);
    expect(await html.text()).toContain("@scalar/api-reference");
    const response = await app.handle(
      new Request("http://localhost/openapi/json")
    );
    const spec = await response.json();
    expect(spec.openapi).toStartWith("3.1.");
    expect(
      spec.paths["/api/tasks"].post.requestBody.content["application/json"]
        .schema.required
    ).toEqual(["title"]);
    expect(
      spec.paths["/api/tasks"].get.responses["200"].content["application/json"]
        .schema.type
    ).toBe("object");
    expect(spec.paths["/api/tasks"].get.security).toEqual([
      { sessionCookie: [] },
    ]);
    expect(spec.paths["/health"].get).toBeDefined();
    expect(spec.paths["/rpc/*"]).toBeUndefined();
    expect(spec.paths["/api/*"]).toBeUndefined();
  });

  test("REST compartilha validação, autenticação e aplicação com RPC", async () => {
    const { app, rpc } = await setup();
    const rest = (method: string, body?: unknown, user?: string) =>
      app.handle(
        new Request("http://localhost/api/tasks", {
          method,
          headers: {
            "content-type": "application/json",
            ...(user ? { "x-test-user": user } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })
      );
    expect((await rest("GET")).status).toBe(401);
    expect((await rest("POST", { title: 1 }, "user-1")).status).toBe(400);
    const response = await rest(
      "POST",
      { title: "REST", authorId: "user-2" },
      "user-1"
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      title: "REST",
      authorId: "user-1",
      mentions: [],
    });
    // A mesma tarefa aparece para outra conta, por REST e por RPC.
    const others = await (await rest("GET", undefined, "user-2")).json();
    expect(others).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(others.items).toHaveLength(1);
    const list = await (await rpc("list", undefined, "user-1")).json();
    expect(list.json.items).toHaveLength(1);
  });
});
