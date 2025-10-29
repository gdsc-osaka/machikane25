import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { createId } from "@paralleldrive/cuid2";
import { stores } from "./stores";
import { customers } from "./customers";
import { relations } from "drizzle-orm";

export const visits = pgTable(
  "visits",
  {
    id: varchar("id", { length: CUID_LENGTH })
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    storeId: varchar("store_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    checkinAt: timestamp("checkin_at").notNull(),
    checkoutAt: timestamp("checkout_at"),
  },
  () => []
);

export const visitsRelations = relations(visits, ({ one }) => ({
  store: one(stores, {
    fields: [visits.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [visits.customerId],
    references: [customers.id],
  }),
}));
