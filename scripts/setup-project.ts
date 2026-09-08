import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnv } from "node:util";

export const validName = (name: string) => /^[a-z][a-z0-9-]{0,49}$/.test(name);
const identityFiles = [
  "package.json", "apps/server/package.json", "apps/client/package.json",
  "apps/server/Dockerfile", "apps/client/Dockerfile", ".railway/railway.ts",
  "apps/client/src/lib/rpc.ts", "apps/client/src/features/auth/auth-page.tsx", "apps/client/src/components/brand.tsx",
  "apps/client/src/components/layout/app-sidebar.tsx", "apps/client/src/components/layout/app-shell.tsx",
  "apps/client/index.html",
];

export async function renameProject(root: string, name: string) {
  if (!validName(name)) throw new Error("Use de 1 a 50 caracteres: letras minúsculas, números e hífens, começando com letra.");
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const previous: string = manifest.name;
  if (previous === name) return;
  if (!validName(previous)) throw new Error("O nome atual exige renomeação manual.");
  const title = (value: string) => value[0]!.toUpperCase() + value.slice(1);
  // Lista explícita: nunca percorre .git, .env, migrations ou arquivos do domínio.
  const changes = await Promise.all(identityFiles.map(async (path) => {
    const file = join(root, path);
    const original = await readFile(file, "utf8");
    return { file, content: original.replace(new RegExp(`(?<![a-zA-Z0-9_-])${previous}(?![a-zA-Z0-9_-])`, "g"), name).replace(new RegExp(`(?<![a-zA-Z0-9_-])${title(previous)}(?![a-zA-Z0-9_-])`, "g"), title(name)) };
  }));
  // O manifest raiz é o marcador da identidade; grave-o por último para permitir nova tentativa.
  for (const change of [...changes.slice(1), changes[0]!]) await writeFile(change.file, change.content);
}

export async function prepareEnvironment(root: string) {
  const created: string[] = [];
  for (const app of ["server", "client"]) {
    const path = join(root, "apps", app, ".env");
    let contents = await readFile(`${path}.example`, "utf8");
    if (app === "server") contents = contents.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
    try { await writeFile(path, contents, { flag: "wx", mode: 0o600 }); created.push(app); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  return created;
}

export async function readServerEnvironment(root: string) {
  return parseEnv(await readFile(join(root, "apps/server/.env"), "utf8"));
}

export function assertLocalDatabase(env: Record<string, string | undefined>) {
  // O setup só migra o banco do Compose fornecido; outros destinos exigem operação manual.
  if (env.DATABASE_URL !== "postgresql://app:app@localhost:5432/app") {
    throw new Error("DATABASE_URL não corresponde ao Compose local. Use --database skip e configure/aplique migrations manualmente.");
  }
}
