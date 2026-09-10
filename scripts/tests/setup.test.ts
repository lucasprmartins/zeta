import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { assertLocalDatabase, prepareEnvironment, readServerEnvironment, renameProject, validName } from "../setup-project";
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "zeta-setup-test-")); roots.push(root);
  for (const path of ["package.json", "apps/server/package.json", "apps/client/package.json", "apps/server/Dockerfile", "apps/client/Dockerfile", ".railway/railway.ts", "apps/client/src/lib/rpc.ts", "apps/client/src/components/theme-provider.tsx", "apps/client/src/features/auth/auth-page.tsx", "apps/client/src/components/brand.tsx", "apps/client/src/components/layout/app-sidebar.tsx", "apps/client/src/components/layout/app-shell.tsx", "packages/guide-content/package.json", "apps/server/src/interfaces/http/rpc/guides.ts", "apps/server/scripts/import-guides.ts", "apps/client/src/features/guides/content.tsx", "apps/client/src/features/guides/block-editor.tsx", "packages/access/package.json", "apps/server/src/infrastructure/auth/access.ts", "apps/client/src/lib/access.ts", "apps/client/index.html"]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), path === "package.json" ? '{"name":"zeta"}' : '@zeta/server zeta:sidebar-collapsed Zeta zeta apps application');
  }
  await writeFile(join(root, "apps/server/.env.example"), 'DATABASE_URL=postgresql://app:app@localhost:5432/app\nBETTER_AUTH_SECRET=placeholder\n');
  await writeFile(join(root, "apps/client/.env.example"), 'API_PROXY_TARGET=http://localhost:3000\n');
  return root;
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
test("gera segredo individual e preserva ambiente na reexecução", async () => {
  const root = await fixture();
  expect(await prepareEnvironment(root)).toEqual(["server", "client"]);
  const before = await readFile(join(root, "apps/server/.env"), "utf8");
  expect((await readServerEnvironment(root)).BETTER_AUTH_SECRET!.length).toBeGreaterThanOrEqual(32);
  expect(await prepareEnvironment(root)).toEqual([]);
  expect(await readFile(join(root, "apps/server/.env"), "utf8")).toBe(before);
  const another = await fixture(); await prepareEnvironment(another);
  expect((await readServerEnvironment(another)).BETTER_AUTH_SECRET).not.toBe((await readServerEnvironment(root)).BETTER_AUTH_SECRET);
});
test("preserva integralmente um ambiente personalizado", async () => {
  const root = await fixture(); const value = '# local\nDATABASE_URL=custom\nBETTER_AUTH_SECRET=my-secret\n';
  await writeFile(join(root, "apps/server/.env"), value);
  await prepareEnvironment(root);
  expect(await readFile(join(root, "apps/server/.env"), "utf8")).toBe(value);
});
test("renomeia referências sem atingir palavras ou configuração local", async () => {
  const root = await fixture(); await prepareEnvironment(root);
  const before = await readFile(join(root, "apps/server/.env"), "utf8");
  await renameProject(root, "app"); await renameProject(root, "app"); await renameProject(root, "acme");
  expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).name).toBe("acme");
  expect(await readFile(join(root, "apps/client/src/lib/rpc.ts"), "utf8")).toBe('@acme/server acme:sidebar-collapsed Acme acme apps application');
  expect(await readFile(join(root, "apps/server/.env"), "utf8")).toBe(before);
});
test("recusa nomes perigosos e destinos de banco fora do Compose", () => {
  for (const name of ["../foo", "$(cmd)", "Foo", "", "a".repeat(51)]) expect(validName(name)).toBe(false);
  expect(() => assertLocalDatabase({ DATABASE_URL: "postgresql://app:app@remote:5432/app" })).toThrow();
  expect(() => assertLocalDatabase({ DATABASE_URL: "postgresql://app:app@localhost:5432/app" })).not.toThrow();
});
