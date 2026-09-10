import type { GuideRepository } from "@server/domain/guides/contracts/guide-repository";
import type { Guide } from "@server/domain/guides/entities/guide";
import type { Database } from "@server/infrastructure/database/client";
import { guides } from "@server/infrastructure/database/schema/guides";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { pageLimit, pageOffset, paginate } from "./pagination";

// O cast por text evita que Bun SQL codifique novamente a string JSON enviada pelo Drizzle.
const jsonValue = (value: Guide["published"]) =>
  value === null ? null : sql`${JSON.stringify(value)}::text::jsonb`;
const values = (guide: Guide) => ({
  ...guide,
  draft: jsonValue(guide.draft)!,
  published: jsonValue(guide.published),
  updatedAt: new Date(guide.updatedAt),
});
const restore = (row: typeof guides.$inferSelect): Guide => ({
  ...row,
  updatedAt: row.updatedAt.toISOString(),
});
export function createGuideRepository(db: Database): GuideRepository {
  return {
    async find(slug) {
      const row = (
        await db.select().from(guides).where(eq(guides.slug, slug)).limit(1)
      )[0];
      return row ? restore(row) : null;
    },
    async list(page, grants) {
      const content = grants === null ? guides.draft : guides.published;
      // Lista vazia é pública entre as sessões; com itens, uma concessão em comum basta.
      const visible =
        grants === null
          ? undefined
          : and(
              isNotNull(guides.published),
              or(
                sql`jsonb_array_length(${guides.published}->'permissions') = 0`,
                grants.length
                  ? sql`exists (select 1 from jsonb_array_elements_text(${guides.published}->'permissions') as required(id) where ${inArray(sql`required.id`, [...grants])})`
                  : sql`false`
              )
            );
      const rows = await db
        .select()
        .from(guides)
        .where(visible)
        .orderBy(
          sql`${content}->>'section'`,
          sql`(${content}->>'order')::integer`,
          sql`${content}->>'title'`,
          guides.slug
        )
        .limit(pageLimit)
        .offset(pageOffset(page));
      const window = paginate(rows);
      return { ...window, items: window.items.map(restore) };
    },
    async insert(guide) {
      return (
        (
          await db
            .insert(guides)
            .values(values(guide))
            .onConflictDoNothing()
            .returning({ slug: guides.slug })
        ).length > 0
      );
    },
    async replace(guide, version) {
      return (
        (
          await db
            .update(guides)
            .set(values(guide))
            .where(
              and(eq(guides.slug, guide.slug), eq(guides.version, version))
            )
            .returning({ slug: guides.slug })
        ).length > 0
      );
    },
  };
}
