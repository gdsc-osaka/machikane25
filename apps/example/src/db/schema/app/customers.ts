import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { stores } from "./stores";
import { relations } from "drizzle-orm";
import { profiles } from "./profiles";

export const customers = pgTable("customers", {
  id: varchar("id", { length: CUID_LENGTH }).primaryKey().notNull(),
  tosAcceptedAt: timestamp("tos_accepted_at"),
  storeId: varchar("store_id", { length: CUID_LENGTH })
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  profiles: many(profiles),
}));
