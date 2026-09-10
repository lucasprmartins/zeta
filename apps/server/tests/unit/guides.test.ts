import { expect, test } from "bun:test";
import { manageGuides } from "@server/domain/guides/application/manage-guides";
import type { Guide } from "@server/domain/guides/entities/guide";
import { parseGuideFile, parseMarkdown, toMarkdown } from "@zeta/guide-content";
const fields = { title: "Guia", section: "Geral", order: 1, markdown: "# Comece aqui\n\nTexto", permission: null };
function setup() {
  const records = new Map<string, Guide>();
  const service = manageGuides({
    find: async (slug) => records.get(slug) ?? null,
    list: async () => ({ items: [...records.values()], hasMore: false }),
    insert: async (guide) => { if (records.has(guide.slug)) return false; records.set(guide.slug, guide); return true; },
    replace: async (guide, version) => { if (records.get(guide.slug)?.version !== version) return false; records.set(guide.slug, guide); return true; },
  }, ["tasks:read"], () => "2026-01-01T00:00:00.000Z");
  return service;
}
test("rascunho não altera publicação e edição concorrente não sobrescreve", async () => {
  const service = setup();
  const first = await service.save({ slug: "inicio", draft: fields, action: "publish" });
  await service.save({ slug: "inicio", draft: { ...fields, markdown: "Novo rascunho" }, version: first.version, action: "draft" });
  expect((await service.read("inicio", [])).markdown).toBe(fields.markdown);
  await expect(service.save({ slug: "inicio", draft: fields, version: first.version, action: "publish" })).rejects.toThrow("alterado");
  expect(await service.importMissing("inicio", { ...fields, title: "Arquivo antigo" })).toBe(false);
  expect((await service.adminGet("inicio")).draft.markdown).toBe("Novo rascunho");
  await service.save({ slug: "inicio", draft: fields, version: 2, action: "unpublish" });
  await expect(service.read("inicio", [])).rejects.toThrow("não encontrado");
});
test("guia exige conteúdo na publicação e respeita permissão da versão publicada", async () => {
  const service = setup();
  await expect(service.save({ slug: "inicio", draft: { ...fields, markdown: "" }, action: "publish" })).rejects.toThrow("conteúdo");
  await expect(service.save({ slug: "inicio", draft: { ...fields, permission: "unknown" }, action: "draft" })).rejects.toThrow("Permissão");
  await service.save({ slug: "inicio", draft: { ...fields, permission: "tasks:read" }, action: "publish" });
  await expect(service.read("inicio", [])).rejects.toThrow("não encontrado");
  expect((await service.read("inicio", ["tasks:read"])).title).toBe("Guia");
  expect(await service.importMissing("outro", fields)).toBe(true);
  await expect(service.read("outro", ["tasks:read"])).rejects.toThrow("não encontrado");
});
test("Markdown preserva blocos básicos e textos literais sem executar HTML", () => {
  const blocks = [{ type: "heading" as const, level: 1 as const, text: "Título" }, { type: "paragraph" as const, text: "# texto literal" }, { type: "paragraph" as const, text: "<script>alert(1)</script>" }, { type: "paragraph" as const, text: "![exemplo](arquivo)" }];
  blocks.push({ type: "paragraph", text: "\\![literal](arquivo)" }, { type: "heading", level: 1, text: "![literal](arquivo)" });
  expect(parseMarkdown(toMarkdown(blocks))).toEqual(blocks);
  expect(() => parseMarkdown("![imagem](https://example.com/img.png)")).toThrow("Imagens");
  expect(() => parseMarkdown("#### Não suportado")).toThrow("H3");
  const guide = parseGuideFile('---\nslug: inicio\ntitle: "Início"\nsection: Geral\norder: 2\n---\n# Olá\n\nTexto');
  expect(guide).toMatchObject({ slug: "inicio", draft: { title: "Início", order: 2, permission: null } });
  expect(() => parseGuideFile('---\nslug: inicio\nslug: outro\n---\nTexto')).toThrow("duplicado");
});
