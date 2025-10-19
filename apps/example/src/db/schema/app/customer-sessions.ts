import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { customers } from "./customers";
import { createId } from "@paralleldrive/cuid2";

export const customerSessions = pgTable("customer_sessions", {
  id: varchar("id", { length: CUID_LENGTH })
    .$defaultFn(() => createId())
    .primaryKey()
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  customerId: varchar("customer_id", { length: CUID_LENGTH })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
});

export const customerSessionsRelation = relations(
  customerSessions,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerSessions.customerId],
      references: [customers.id],
    }),
  })
);
