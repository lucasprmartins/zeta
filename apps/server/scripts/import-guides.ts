import { resolve } from "node:path";
import { manageGuides } from "@server/domain/guides/application/manage-guides";
import { guideFields, guideSlug } from "@server/domain/guides/entities/guide";
import { permissionIds } from "@server/infrastructure/auth/access";
import { createDatabase } from "@server/infrastructure/database/client";
import { createGuideRepository } from "@server/infrastructure/repositories/drizzle-guide-repository";
import { parseGuideFile } from "@zeta/guide-content";

const args = process.argv.slice(2);
if (args.length > 1 || args[0]?.startsWith("-")) {
  throw new Error("Uso: bun run guides:import [diretório de arquivos .md]");
}
const directory = args[0]
  ? resolve(args[0])
  : new URL("../../../docs/guides", import.meta.url).pathname;
const files = [
  ...new Bun.Glob("**/*.md").scanSync({ cwd: directory, absolute: true }),
].sort();
if (!files.length) {
  throw new Error("Nenhum arquivo .md encontrado.");
}
if (files.length > 1000) {
  throw new Error("Importe até 1000 arquivos por execução.");
}
const parsed = await Promise.all(
  files.map(async (path) => {
    const file = Bun.file(path);
    if (file.size > 100_000) {
      throw new Error(`Arquivo muito grande: ${path}`);
    }
    try {
      const guide = parseGuideFile(await file.text());
      guideSlug(guide.slug);
      guideFields(guide.draft);
      const unknown = guide.draft.permissions.filter(
        (permission) => !permissionIds.some((id) => id === permission)
      );
      if (unknown.length) {
        throw new Error(`Permissão desconhecida: ${unknown.join(", ")}.`);
      }
      return guide;
    } catch (error) {
      throw new Error(
        `${path}: ${error instanceof Error ? error.message : "Arquivo inválido"}`,
        { cause: error }
      );
    }
  })
);
if (new Set(parsed.map((guide) => guide.slug)).size !== parsed.length) {
  throw new Error("Há identificadores duplicados nos arquivos.");
}
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL é obrigatória.");
}
const database = createDatabase(url);
try {
  const service = manageGuides(
    createGuideRepository(database.db),
    permissionIds,
    () => new Date().toISOString()
  );
  for (const guide of parsed) {
    const created = await service.importMissing(guide.slug, guide.draft);
    console.info(
      `${created ? "Rascunho criado" : "Existente preservado"}: ${guide.slug}`
    );
  }
} finally {
  await database.close();
}
