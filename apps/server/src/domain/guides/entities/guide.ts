export type GuideFields = {
  title: string;
  section: string;
  order: number;
  markdown: string;
  permission: string | null;
};
export type Guide = {
  slug: string;
  draft: GuideFields;
  published: GuideFields | null;
  version: number;
  updatedAt: string;
};
export class GuideError extends Error {
  constructor(
    public readonly code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
  }
}
export function guideFields(input: GuideFields): GuideFields {
  const title = input.title.trim(),
    section = input.section.trim();
  if (!title || title.length > 120 || !section || section.length > 80) {
    throw new GuideError(
      "BAD_REQUEST",
      "Informe título (até 120 caracteres) e seção (até 80 caracteres)."
    );
  }
  if (
    !Number.isSafeInteger(input.order) ||
    input.order < 0 ||
    input.order > 10_000
  ) {
    throw new GuideError(
      "BAD_REQUEST",
      "A ordem deve ser um número de 0 a 10000."
    );
  }
  if (input.markdown.length > 50_000) {
    throw new GuideError(
      "BAD_REQUEST",
      "O conteúdo deve ter até 50 mil caracteres."
    );
  }
  return { ...input, title, section };
}
export function guideSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    throw new GuideError(
      "BAD_REQUEST",
      "Use um identificador de até 100 caracteres, com letras minúsculas, números e hífens."
    );
  }
  return slug;
}
export function readable(guide: Guide, grants: readonly string[]): boolean {
  return (
    !!guide.published &&
    (!guide.published.permission || grants.includes(guide.published.permission))
  );
}
