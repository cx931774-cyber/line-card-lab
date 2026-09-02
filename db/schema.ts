import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  // Legacy column name retained so existing accounts remain compatible. It stores an email or username.
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("free"),
  vipExpiresAt: integer("vip_expires_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const cardFavorites = sqliteTable("card_favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  stateJson: text("state_json").notNull(),
  previewImage: text("preview_image"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_card_favorites_user_updated").on(table.userId, table.updatedAt),
]);

export const paymentSubmissions = sqliteTable("payment_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  amountCents: integer("amount_cents").notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_payment_submissions_user_created").on(table.userId, table.createdAt),
]);

export const generationEvents = sqliteTable("generation_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  template: text("template").notNull(),
  accessType: text("access_type").notNull(),
  status: text("status").notNull(),
  plan: text("plan").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_generation_events_user_access_status").on(table.userId, table.accessType, table.status),
  index("idx_generation_events_created").on(table.createdAt),
]);
