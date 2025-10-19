import { DBorTx } from "../db/db";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { DBStaff, DBStaffForCreate, DBStaffForStore } from "../domain/staff";
import { DBInternalError } from "./shared/db-error";
import {
  DBStaffAlreadyExistsError,
  DBStaffNotFoundError,
} from "./staff-repo.error";
import { staffs, storesToStaffs } from "../db/schema/app/stores";
import { and, eq } from "drizzle-orm";
import { Uid } from "../domain/auth";

export type FetchDBStaffByUserId = (
  db: DBorTx
) => (
  userId: Uid
) => ResultAsync<DBStaff, DBInternalError | DBStaffNotFoundError>;

export const fetchDBStaffByUserId: FetchDBStaffByUserId = (db) => (userId) =>
  ResultAsync.fromPromise(
    db.select().from(staffs).where(eq(staffs.userId, userId)).limit(1),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? okAsync(records[0])
      : errAsync(DBStaffNotFoundError("Staff not found", { extra: { userId } }))
  );

export type FetchDBStaffByStoreIdAndEmail = (
  db: DBorTx
) => (
  storeId: string,
  email: string
) => ResultAsync<DBStaff, DBInternalError | DBStaffNotFoundError>;

export const fetchDBStaffByStoreIdAndEmail: FetchDBStaffByStoreIdAndEmail =
  (db) => (storeId, email) =>
    ResultAsync.fromPromise(
      db
        .select({
          staff: staffs,
        })
        .from(staffs)
        .innerJoin(storesToStaffs, eq(staffs.id, storesToStaffs.staffId))
        .where(
          and(eq(staffs.email, email), eq(storesToStaffs.storeId, storeId))
        )
        .limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0].staff)
        : errAsync(
            DBStaffNotFoundError("Staff not found", {
              extra: { storeId, email },
            })
          )
    );

export type FetchDBStaffForStoreById = (
  db: DBorTx
) => (
  userId: Uid,
  storeId: string
) => ResultAsync<DBStaffForStore, DBInternalError | DBStaffNotFoundError>;

export const fetchDBStaffForStoreById: FetchDBStaffForStoreById =
  (db) => (userId, storeId) =>
    ResultAsync.fromPromise(
      db
        .select({
          role: storesToStaffs.role,
          staff: staffs,
        })
        .from(storesToStaffs)
        .innerJoin(staffs, eq(storesToStaffs.staffId, staffs.id))
        .where(
          and(eq(staffs.userId, userId), eq(storesToStaffs.storeId, storeId))
        )
        .limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync({
            ...records[0].staff,
            role: records[0].role,
          })
        : errAsync(
            DBStaffNotFoundError("Staff not found", {
              extra: { userId: userId },
            })
          )
    );

export type InsertDBStaff = (
  db: DBorTx
) => (
  staff: DBStaffForCreate
) => ResultAsync<DBStaff, DBInternalError | DBStaffAlreadyExistsError>;

export const insertDBStaff: InsertDBStaff = (db) => (staff) =>
  ResultAsync.fromPromise(
    db.insert(staffs).values(staff).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? okAsync(records[0])
      : errAsync(DBStaffAlreadyExistsError("Staff already exists"))
  );
