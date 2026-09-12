import { text } from "drizzle-orm/pg-core";
import { consoleSchema } from "./namespaces";

export const supportSettings = consoleSchema.table("support", {
  id: text("id").primaryKey(),
  encryptedConfiguration: text("encrypted_configuration").notNull(),
});
