import { DBStoreToStaff, DBStoreToStaffForCreate } from "../domain/store-staff";
import { DBorTx } from "../db/db";
import { err, ok, ResultAsync } from "neverthrow";
import { DBInternalError } from "./shared/db-error";
import { DBStoreToStaffAlreadyExistsError } from "./store-to-staff-repo.error";
import { storesToStaffs } from "../db/schema/app/stores";

export type InsertDBStoreToStaff = (
  db: DBorTx
) => (
  dbStoreToStaff: DBStoreToStaffForCreate
) => ResultAsync<
  DBStoreToStaff,
  DBInternalError | DBStoreToStaffAlreadyExistsError
>;

export const insertDBStoreToStaff: InsertDBStoreToStaff =
  (db) => (dbStoreToStaff) =>
    ResultAsync.fromPromise(
      db.insert(storesToStaffs).values(dbStoreToStaff).returning(),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? ok(records[0])
        : err(DBStoreToStaffAlreadyExistsError("Store to staff already exists"))
    );
