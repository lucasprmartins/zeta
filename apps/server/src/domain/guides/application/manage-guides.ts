import type { GuideRepository } from "../contracts/guide-repository";
import { GuideError, guideFields, guideSlug, readable, type Guide, type GuideFields } from "../entities/guide";
export function manageGuides(repository: GuideRepository, availablePermissions: readonly string[], now: () => string) {
  function fields(input: GuideFields) {
    if (input.permission !== null && !availablePermissions.includes(input.permission)) throw new GuideError("BAD_REQUEST", "Permissão de leitura inválida.");
    return guideFields(input);
  }
  async function get(slug: string) {
    const guide = await repository.find(guideSlug(slug));
    if (!guide) throw new GuideError("NOT_FOUND", "Guia não encontrado.");
    return guide;
  }
  return {
    adminGet: get,
    adminList: (page: number) => repository.list(page, null),
    async read(slug: string, grants: readonly string[]) {
      const guide = await get(slug);
      if (!readable(guide, grants)) throw new GuideError("NOT_FOUND", "Guia não encontrado.");
      return { slug: guide.slug, ...guide.published! };
    },
    async list(page: number, grants: readonly string[]) {
      const result = await repository.list(page, grants);
      return { hasMore: result.hasMore, items: result.items.filter((guide) => readable(guide, grants)).map((guide) => ({ slug: guide.slug, title: guide.published!.title, section: guide.published!.section, order: guide.published!.order })) };
    },
    async save(input: { slug: string; draft: GuideFields; version?: number; action: "draft" | "publish" | "unpublish" }) {
      const slug = guideSlug(input.slug), draft = fields(input.draft);
      const previous = await repository.find(slug);
      if (previous ? previous.version !== input.version : input.version !== undefined) throw new GuideError("CONFLICT", "Este guia foi alterado ou já existe. Recarregue antes de salvar.");
      if (input.action === "publish" && !draft.markdown.trim()) throw new GuideError("BAD_REQUEST", "Adicione conteúdo antes de publicar.");
      const guide: Guide = { slug, draft, published: input.action === "publish" ? { ...draft } : input.action === "unpublish" ? null : previous?.published ?? null, version: (previous?.version ?? 0) + 1, updatedAt: now() };
      const saved = previous ? await repository.replace(guide, previous.version) : await repository.insert(guide);
      if (!saved) throw new GuideError("CONFLICT", "Este guia foi alterado por outra pessoa. Recarregue antes de salvar.");
      return guide;
    },
    async importMissing(slug: string, draft: GuideFields) {
      return repository.insert({ slug: guideSlug(slug), draft: fields(draft), published: null, version: 1, updatedAt: now() });
    },
  };
}
