import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    eventId: text("event_id").notNull(),
    kind: text("kind").notNull(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 120 }).notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: text("reference_id").notNull(),
    requiredPermission: text("required_permission").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    unique("notifications_delivery_unique").on(
      table.eventId,
      table.kind,
      table.recipientId
    ),
    index("notifications_inbox_idx").on(
      table.recipientId,
      table.createdAt,
      table.id
    ),
    index("notifications_unread_idx").on(
      table.recipientId,
      table.readAt,
      table.createdAt,
      table.id
    ),
  ]
);
