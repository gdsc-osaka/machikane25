import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

export const stores = pgTable(
  "stores",
  {
    id: varchar("id", { length: CUID_LENGTH })
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    publicId: text("public_id").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("stores_public_id_idx").using("btree", t.publicId)]
);

export const staffs = pgTable(
  "staffs",
  {
    id: varchar("id", { length: CUID_LENGTH })
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    userId: text("user_id").notNull(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("staffs_user_id_idx").using("btree", t.userId)]
);

export const staffRole = pgEnum("staff_role", ["ADMIN", "STAFF"]);

export const storesToStaffs = pgTable(
  "stores_to_staffs",
  {
    storeId: varchar("store_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    staffId: varchar("staff_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => staffs.id, { onDelete: "cascade" }),
    role: staffRole("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.staffId] })]
);

export const storesRelations = relations(stores, ({ many }) => ({
  storesToStaffs: many(storesToStaffs),
}));

export const staffsRelations = relations(staffs, ({ many }) => ({
  storesToStaffs: many(storesToStaffs),
}));

export const storesToStaffsRelations = relations(storesToStaffs, ({ one }) => ({
  store: one(stores, {
    fields: [storesToStaffs.storeId],
    references: [stores.id],
  }),
  staff: one(staffs, {
    fields: [storesToStaffs.staffId],
    references: [staffs.id],
  }),
}));
