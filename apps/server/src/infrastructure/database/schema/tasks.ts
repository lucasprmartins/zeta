import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["pending", "completed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("tasks_owner_created_idx").on(table.ownerId, table.createdAt, table.id),
  check("tasks_status_check", sql`${table.status} in ('pending', 'completed')`),
  check("tasks_completion_check", sql`(${table.status} = 'pending' and ${table.completedAt} is null) or (${table.status} = 'completed' and ${table.completedAt} is not null)`),
]);
