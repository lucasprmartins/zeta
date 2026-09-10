import { consoleSchema } from "./namespaces";
import { boolean, text } from "drizzle-orm/pg-core";

export const registrationSettings = consoleSchema.table("registration", {
  id: text("id").primaryKey(),
  allowSignUp: boolean("allow_sign_up").notNull(),
  requireApproval: boolean("require_approval").notNull(),
});
