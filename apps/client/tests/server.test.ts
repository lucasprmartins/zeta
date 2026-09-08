import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClientHandler } from "../server/handler";

const directory = await mkdtemp(join(tmpdir(), "zeta-client-"));
let handler: Awaited<ReturnType<typeof createClientHandler>>;
let received: { path: string; body: string; cookie: string | null; origin: string | null; host: string | null };
const upstream = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    received = { path: url.pathname + url.search, body: await request.text(), cookie: request.headers.get("cookie"), origin: request.headers.get("origin"), host: request.headers.get("x-forwarded-host") };
    if (url.pathname === "/api/redirect") return new Response(null, { status: 302, headers: { location: "https://example.com/next" } });
    if (url.pathname === "/api/compressed") return new Response(Bun.gzipSync("compressed response"), { headers: { "content-encoding": "gzip" } });
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "session=one; Path=/; HttpOnly; Secure");
    headers.append("set-cookie", "session_data=two; Path=/; HttpOnly; Secure");
    return new Response('{"ok":true}', { headers });
  },
});
beforeAll(async () => {
  await mkdir(join(directory, "assets"));
  await Bun.write(join(directory, "index.html"), "<html>app</html>");
  await Bun.write(join(directory, "assets/app-123.js"), "console.log('app')");
  await Bun.write(join(directory, ".env"), "hidden");
  handler = await createClientHandler({ directory, apiOrigin: upstream.url.origin, publicOrigin: "https://app.example.com" });
});
afterAll(async () => { await upstream.stop(true); await rm(directory, { recursive: true, force: true }); });
function request(path: string, init?: RequestInit) { return new Request(`https://app.example.com${path}`, init); }

test("serves SPA navigation, static assets and HEAD with the appropriate cache policy", async () => {
  const page = await handler(request("/tasks?status=pending", { headers: { accept: "text/html" } }));
  expect(await page.text()).toBe("<html>app</html>");
  expect(page.headers.get("cache-control")).toBe("no-cache");
  const asset = await handler(request("/assets/app-123.js"));
  expect(await asset.text()).toContain("console.log");
  expect(asset.headers.get("cache-control")).toContain("immutable");
  const head = await handler(request("/assets/app-123.js", { method: "HEAD" }));
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
});
test("does not expose missing assets, dotfiles or arbitrary filesystem paths", async () => {
  for (const path of ["/assets/missing.js", "/.env", "/%2eenv", "/%2e%2e%2fpackage.json", "/unknown.json"]) {
    expect((await handler(request(path, { headers: { accept: "text/html" } }))).status).toBe(404);
  }
  expect((await handler(request("/%invalid"))).status).toBe(400);
  expect((await handler(request("/tasks", { method: "POST" }))).status).toBe(405);
});
test("forwards body, query, cookies and origin and preserves multiple Set-Cookie headers", async () => {
  const response = await handler(request("/api/auth/sign-in/email?test=1", {
    method: "POST", body: '{"email":"qa@example.com"}',
    headers: { "content-type": "application/json", cookie: "session=old", origin: "https://app.example.com", "x-forwarded-host": "spoof.example.com" },
  }));
  expect(received).toEqual({ path: "/api/auth/sign-in/email?test=1", body: '{"email":"qa@example.com"}', cookie: "session=old", origin: "https://app.example.com", host: "app.example.com" });
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
test("forwards all API prefixes without treating similar page names as API routes", async () => {
  for (const path of ["/rpc/tasks/list", "/openapi", "/openapi/json", "/health", "/ready"]) {
    expect((await handler(request(path))).status).toBe(200);
    expect(received.path).toBe(path);
  }
  expect((await handler(request("/apiary"))).status).toBe(404);
  expect(await (await handler(request("/_health"))).json()).toEqual({ status: "ok" });
});
test("preserves redirects and compressed bodies from the API", async () => {
  const redirect = await handler(request("/api/redirect"));
  expect(redirect.status).toBe(302);
  expect(redirect.headers.get("location")).toBe("https://example.com/next");
  const compressed = await handler(request("/api/compressed"));
  expect(compressed.headers.get("content-encoding")).toBe("gzip");
  expect(new TextDecoder().decode(Bun.gunzipSync(await compressed.arrayBuffer()))).toBe("compressed response");
});
test("fails at startup when the frontend build is missing", async () => {
  const empty = await mkdtemp(join(tmpdir(), "zeta-empty-client-"));
  try { await expect(createClientHandler({ directory: empty, apiOrigin: upstream.url.origin, publicOrigin: "https://app.example.com" })).rejects.toThrow("Build do cliente"); }
  finally { await rm(empty, { recursive: true, force: true }); }
});
test("returns 502 when the API is unavailable", async () => {
  const stopped = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("ok") });
  const apiOrigin = stopped.url.origin;
  await stopped.stop(true);
  const unavailable = await createClientHandler({ directory, apiOrigin, publicOrigin: "https://app.example.com" });
  expect((await unavailable(request("/api/tasks"))).status).toBe(502);
});
