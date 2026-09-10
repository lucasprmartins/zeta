import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { readEnv } from "../apps/server/src/config/env";
import { publishToGitHub } from "./publish";
import {
  assertLocalDatabase,
  prepareEnvironment,
  readServerEnvironment,
  renameProject,
  validName,
} from "./setup-project";

const root = resolve(import.meta.dirname, "..");
async function run(
  command: string[],
  env?: Record<string, string | undefined>,
  quiet = false
) {
  const child = Bun.spawn(command, {
    cwd: root,
    env: env ?? process.env,
    stdin: "inherit",
    stdout: quiet ? "ignore" : "inherit",
    stderr: quiet ? "ignore" : "inherit",
  });
  if ((await child.exited) !== 0) {
    throw new Error(
      `Falha em ${command.slice(0, 3).join(" ")}. Corrija a causa e execute o setup novamente.`
    );
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      database: { type: "string" },
      yes: { type: "boolean" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "bun run setup [--name meu-projeto] [--database docker|skip] [--yes] [--dry-run]\nSem flags, o assistente pergunta nome e uso do PostgreSQL local. --yes aceita apenas esse plano local; não publica no GitHub."
    );
    return;
  }
  console.log("\n▦ Zeta · Preparar projeto\n");
  const manifest = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8")
  );
  let name = values.name;
  let database = values.database;
  if (process.stdin.isTTY && !values.yes) {
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      name ??=
        (await input.question(`Nome do projeto [${manifest.name}]: `)).trim() ||
        manifest.name;
      database ??=
        (
          await input.question(
            "Iniciar PostgreSQL do Compose e aplicar migrations? [S/n]: "
          )
        )
          .trim()
          .toLowerCase() === "n"
          ? "skip"
          : "docker";
    } finally {
      input.close();
    }
  }
  if (!(name && database)) {
    throw new Error(
      "Sem terminal interativo, informe --name e --database docker|skip."
    );
  }
  if (!validName(name)) {
    throw new Error(
      "Nome inválido. Use letras minúsculas, números e hífens, começando com letra (até 50 caracteres)."
    );
  }
  if (!["docker", "skip"].includes(database)) {
    throw new Error("--database aceita docker ou skip.");
  }
  console.log(
    `Projeto: ${name}\nCliente: http://localhost:3001\nAPI: http://localhost:3000\nBanco: ${database === "docker" ? "Compose local + migrations" : "configuração manual"}\n`
  );
  if (values["dry-run"]) {
    console.log("Simulação: nenhum arquivo ou serviço foi alterado.");
    return;
  }
  if (!values.yes) {
    if (!process.stdin.isTTY) {
      throw new Error(
        "Use --yes para aplicar o plano em execução não interativa."
      );
    }
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      if (
        !/^(s|sim)$/i.test(
          (await input.question("Aplicar este plano local? [s/N]: ")).trim()
        )
      ) {
        console.log("Setup cancelado.");
        return;
      }
    } finally {
      input.close();
    }
  }
  // Falhe antes da renomeação quando o ambiente existente não puder ser usado com segurança.
  const existing = Bun.file(resolve(root, "apps/server/.env"));
  if (await existing.exists()) {
    const env = await readServerEnvironment(root);
    readEnv(env);
    if (database === "docker") {
      assertLocalDatabase(env);
    }
  }
  if (database === "docker") {
    await run(["docker", "info"], undefined, true);
    await run(["docker", "compose", "version"], undefined, true);
  }
  await renameProject(root, name);
  console.log(
    "✓ Identidade dos workspaces, imports, marca e Docker atualizada."
  );
  const created = await prepareEnvironment(root);
  console.log(
    `✓ Ambiente preparado (${created.length} arquivo(s) criado(s)); arquivos existentes preservados.`
  );
  await run([process.execPath, "install"]);
  if (database === "docker") {
    const env = await readServerEnvironment(root);
    readEnv(env);
    assertLocalDatabase(env);
    await run(["docker", "compose", "up", "-d", "--wait", "postgres"]);
    // O ambiente validado prevalece sobre DATABASE_URL herdada do terminal.
    await run([process.execPath, "run", "db:migrate"], {
      ...process.env,
      ...env,
    });
  }
  await run([process.execPath, "run", "typecheck"]);
  console.log(
    "\n✓ Setup concluído.\n\nPróximo passo: bun run dev\nCrie sua conta em http://localhost:3001/register\n\nO exemplo de tarefas, README e histórico Git foram preservados. Consulte o README para personalizar o domínio e publicar seu projeto."
  );
  if (process.stdin.isTTY && !values.yes) {
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let publish = false;
    try {
      publish = /^(s|sim)$/i.test(
        (
          await input.question(
            "Publicar agora em um novo repositório GitHub? [s/N]: "
          )
        ).trim()
      );
    } finally {
      input.close();
    }
    if (publish) {
      await publishToGitHub();
    }
  } else {
    console.log(
      "Para publicar depois: bun run publish:github (requer confirmação interativa)."
    );
  }
}
if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `\nSetup interrompido: ${error instanceof Error ? error.message : "erro inesperado"}`
    );
    process.exitCode = 1;
  });
}
