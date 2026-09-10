import { boolean, jsonb, text } from "drizzle-orm/pg-core";
import { authSchema } from "./namespaces";
export const accessRoles = authSchema.table("access", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#737373"),
  grants: jsonb("grants").$type<string[]>().notNull(),
  protected: boolean("protected").notNull().default(false),
});
