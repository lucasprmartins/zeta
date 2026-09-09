import { boolean, jsonb, pgTable, text } from "drizzle-orm/pg-core";
export const accessRoles = pgTable("access_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#737373"),
  grants: jsonb("grants").$type<string[]>().notNull(),
  protected: boolean("protected").notNull().default(false),
});
