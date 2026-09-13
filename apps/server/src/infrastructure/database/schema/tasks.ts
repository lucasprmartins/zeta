import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey(),
    // A tarefa é compartilhada: remover a conta preserva o registro sem autor.
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["pending", "completed"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_title_search_idx").using(
      "gin",
      sql`${table.title} gin_trgm_ops`
    ),
    index("tasks_created_idx").on(table.createdAt, table.id),
    index("tasks_status_created_idx").on(
      table.status,
      table.createdAt,
      table.id
    ),
    index("tasks_author_idx").on(table.authorId),
    check(
      "tasks_status_check",
      sql`${table.status} in ('pending', 'completed')`
    ),
    check(
      "tasks_completion_check",
      sql`(${table.status} = 'pending' and ${table.completedAt} is null) or (${table.status} = 'completed' and ${table.completedAt} is not null)`
    ),
  ]
);

export const taskMentions = pgTable(
  "task_mentions",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("task_mentions_user_idx").on(table.userId),
  ]
);
