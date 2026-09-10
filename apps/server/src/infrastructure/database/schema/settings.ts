import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const registrationSettings = pgTable("registration_settings", {
  id: text("id").primaryKey(),
  allowSignUp: boolean("allow_sign_up").notNull(),
  requireApproval: boolean("require_approval").notNull(),
});
