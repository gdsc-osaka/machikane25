import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { date, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { customers } from "./customers";

export const profiles = pgTable("profiles", {
  id: varchar("id", { length: CUID_LENGTH })
    .$defaultFn(() => createId())
    .primaryKey()
    .notNull(),
  customerId: varchar("customer_id", { length: CUID_LENGTH })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  gender: text("gender"),
  birthday: date("birthday", { mode: "date" }),
  birthplace: text("birthplace"),
  business: text("business"),
  partner: text("partner"),
  hobby: text("hobby"),
  news: text("news"),
  worry: text("worry"),
  store: text("store"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  customer: one(customers, {
    fields: [profiles.customerId],
    references: [customers.id],
  }),
}));
