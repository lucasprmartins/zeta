import { boolean, text } from "drizzle-orm/pg-core";
import { consoleSchema } from "./namespaces";

export const registrationSettings = consoleSchema.table("registration", {
  id: text("id").primaryKey(),
  allowSignUp: boolean("allow_sign_up").notNull(),
  requireApproval: boolean("require_approval").notNull(),
});
