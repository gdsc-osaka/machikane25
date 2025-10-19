import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { CUID_LENGTH } from "../../constants";
import { createId } from "@paralleldrive/cuid2";
import { staffRole, staffs, stores } from "./stores";
import { relations } from "drizzle-orm";

export const staffInvitationStatus = pgEnum("staff_invitation_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
]);

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: varchar("id", { length: CUID_LENGTH })
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    role: staffRole("role").notNull(),
    storeId: varchar("store_id", { length: CUID_LENGTH })
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    targetEmail: varchar("target_email", { length: 255 }).notNull(),
    invitedBy: varchar("invited_by", { length: CUID_LENGTH })
      .notNull()
      .references(() => staffs.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 128 }).notNull().unique(),
    status: staffInvitationStatus("status").notNull(),
    expiredAt: timestamp("expired_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("staff_invitations_store_id_target_email_status_idx").using(
      "btree",
      t.storeId,
      t.targetEmail,
      t.status
    ),
    index("staff_invitations_token_idx").using("btree", t.token),
    unique("staff_invitations_unique_idx").on(t.storeId, t.targetEmail),
  ]
);

export const staffInvitationRelations = relations(
  staffInvitations,
  ({ one }) => ({
    store: one(stores, {
      fields: [staffInvitations.storeId],
      references: [stores.id],
    }),
    invitedByStaff: one(staffs, {
      fields: [staffInvitations.invitedBy],
      references: [staffs.id],
    }),
  })
);
