import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { CUID_LENGTH } from "../../constants";
import { stores } from "./stores";

export const storeApiKeys = pgTable(
  "store_api_keys",
  {
    id: varchar("id", { length: CUID_LENGTH })
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    apiKey: varchar("api_key", { length: 128 }).notNull().unique(),
    storeId: varchar("store_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("store_api_keys_api_key_idx").using("btree", t.apiKey)]
);

export const storeApiKeysRelations = relations(storeApiKeys, ({ one }) => ({
  store: one(stores, {
    fields: [storeApiKeys.storeId],
    references: [stores.id],
  }),
}));
