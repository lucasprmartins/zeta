import type { GuideFields } from "@server/domain/guides/entities/guide";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const guides = pgTable("guides", {
  slug: text("slug").primaryKey(),
  draft: jsonb("draft").$type<GuideFields>().notNull(),
  published: jsonb("published").$type<GuideFields>(),
  version: integer("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
