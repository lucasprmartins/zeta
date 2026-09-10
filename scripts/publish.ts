import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const root = resolve(import.meta.dirname, "..");
async function gitOrGh(args: string[], allowFailure = false) {
  const child = Bun.spawn(args, { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0 && !allowFailure) {
    throw new Error(`Falha em ${args.slice(0, 3).join(" ")}: ${stderr.trim()}`);
  }
  return { stdout: stdout.trim(), code };
}

export async function publishToGitHub() {
  if (!process.stdin.isTTY) {
    throw new Error(
      "A publicação exige um terminal interativo para revisar e confirmar o envio."
    );
  }
  await gitOrGh(["gh", "auth", "status"]);
  const owner = (await gitOrGh(["gh", "api", "user", "--jq", ".login"])).stdout;
  const manifest = await Bun.file(resolve(root, "package.json")).json();
  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const repository =
      (
        await input.question(`Novo repositório [${owner}/${manifest.name}]: `)
      ).trim() || `${owner}/${manifest.name}`;
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(repository)
    ) {
      throw new Error("Informe proprietário/nome válido.");
    }
    const visibility =
      (
        await input.question("Visibilidade [private/public; padrão private]: ")
      ).trim() || "private";
    if (!["private", "public"].includes(visibility)) {
      throw new Error("Visibilidade inválida.");
    }
    const current = await gitOrGh(
      ["git", "rev-parse", "--show-toplevel"],
      true
    );
    if (current.code === 0 && resolve(current.stdout) !== root) {
      throw new Error(
        "A pasta pertence a outro repositório. Separe o projeto antes de publicar."
      );
    }
    if (current.code !== 0) {
      await gitOrGh(["git", "init", "-b", "main"]);
    }
    const branch = (await gitOrGh(["git", "symbolic-ref", "--short", "HEAD"]))
      .stdout;
    await gitOrGh(["git", "check-ref-format", "--branch", branch]);
    if (
      (await gitOrGh(["git", "remote"])).stdout.split("\n").includes("publish")
    ) {
      throw new Error(
        "O remoto publish já existe. Confira-o e finalize o push manualmente."
      );
    }
    if ((await gitOrGh(["gh", "repo", "view", repository], true)).code === 0) {
      throw new Error(
        "O repositório já existe. Este assistente publica apenas em repositórios novos."
      );
    }
    const candidates = (
      await gitOrGh([
        "git",
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
      ])
    ).stdout
      .split("\0")
      .filter(Boolean);
    if (
      candidates.some((path) =>
        path
          .split("/")
          .some(
            (part) =>
              (part === ".env" || part.startsWith(".env.")) &&
              part !== ".env.example"
          )
      )
    ) {
      throw new Error(
        "Há arquivos .env candidatos ao commit. Remova-os do índice e configure o .gitignore antes de publicar."
      );
    }
    console.log(
      "\nArquivos candidatos ao envio (o histórico Git existente também será enviado):\n" +
        candidates.map((path) => `  ${path}`).join("\n")
    );
    console.log(
      "\nAlterações:\n" +
        (await gitOrGh(["git", "status", "--short", "--untracked-files=all"]))
          .stdout
    );
    console.log(
      `\nDestino: https://github.com/${repository}\nVisibilidade: ${visibility}\nBranch: ${branch}\nRemoto novo: publish (origin será preservado)`
    );
    const confirmation = await input.question(
      `Digite ${repository} para criar o repositório, fazer commit e push; Enter cancela: `
    );
    if (confirmation.trim() !== repository) {
      console.log("Publicação cancelada. Setup local preservado.");
      return;
    }
    await gitOrGh(["git", "add", "--all"]);
    if (
      (await gitOrGh(["git", "diff", "--cached", "--quiet"], true)).code !== 0
    ) {
      await gitOrGh(["git", "commit", "-m", "chore: initialize project"]);
    }
    await gitOrGh(["git", "rev-parse", "--verify", "HEAD"]);
    await gitOrGh(["gh", "repo", "create", repository, `--${visibility}`]);
    await gitOrGh([
      "git",
      "remote",
      "add",
      "publish",
      `https://github.com/${repository}.git`,
    ]);
    await gitOrGh(["git", "push", "--set-upstream", "publish", branch]);
    console.log(`\n✓ Publicado em https://github.com/${repository}`);
  } finally {
    input.close();
  }
}
if (import.meta.main) {
  publishToGitHub().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Falha ao publicar."
    );
    console.error(
      "Confira git status e os remotos antes de tentar novamente. O setup local foi preservado."
    );
    process.exitCode = 1;
  });
}
