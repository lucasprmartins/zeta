import {
  boolean,
  index,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authSchema } from "./namespaces";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const user = authSchema.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").default("user").notNull(),
  approvalPending: boolean("approval_pending").default(false).notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps(),
});

export const session = authSchema.table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    impersonatedBy: text("impersonated_by"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [index("auth_session_user_idx").on(table.userId)]
);

export const account = authSchema.table(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  (table) => [
    index("auth_account_user_idx").on(table.userId),
    uniqueIndex("auth_account_issuer_account_idx").on(
      table.issuer,
      table.accountId
    ),
  ]
);

export const verification = authSchema.table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)]
);
