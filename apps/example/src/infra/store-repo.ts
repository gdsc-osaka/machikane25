import { DBorTx } from "../db/db";
import { err, ok, ResultAsync } from "neverthrow";
import { DBStore, DBStoreForCreate } from "../domain/store";
import { DBInternalError } from "./shared/db-error";
import {
  DBStoreAlreadyExistsError,
  DBStoreNotFoundError,
} from "./store-repo.error";
import { staffs, stores } from "../db/schema/app/stores";
import { StaffId } from "../domain/staff";
import { eq } from "drizzle-orm";

export type InsertDBStore = (
  db: DBorTx
) => (
  store: DBStoreForCreate
) => ResultAsync<DBStore, DBInternalError | DBStoreAlreadyExistsError>;

export const insertDBStore: InsertDBStore = (db) => (store) =>
  ResultAsync.fromPromise(
    db.insert(stores).values(store).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? ok(records[0])
      : err(
          DBStoreAlreadyExistsError("Store already exists", {
            extra: { publicId: store.publicId },
          })
        )
  );

export type FetchDBStoresForStaff = (
  db: DBorTx
) => (staffId: StaffId) => ResultAsync<DBStore[], DBInternalError>;

export const fetchDBStoresForStaff: FetchDBStoresForStaff =
  (db: DBorTx) => (staffId: StaffId) =>
    ResultAsync.fromPromise(
      db.query.staffs.findMany({
        columns: {
          id: true,
        },
        with: {
          storesToStaffs: {
            with: {
              store: true,
            },
          },
        },
        where: eq(staffs.id, staffId),
      }),
      DBInternalError.handle
    ).map((records) =>
      records
        .map((record) =>
          record.storesToStaffs.map((storeToStaff) => storeToStaff.store)
        )
        .flat()
    );

export type FetchDBStoreByPublicId = (
  db: DBorTx
) => (
  publicId: string
) => ResultAsync<DBStore, DBInternalError | DBStoreNotFoundError>;

export const fetchDBStoreByPublicId: FetchDBStoreByPublicId =
  (db: DBorTx) => (publicId: string) =>
    ResultAsync.fromPromise(
      db.query.stores.findFirst({
        where: eq(stores.publicId, publicId),
      }),
      DBInternalError.handle
    ).andThen((record) =>
      record
        ? ok(record)
        : err(
            DBStoreNotFoundError("Store not found", {
              extra: { publicId },
            })
          )
    );

export type FetchDBStoreById = (
  db: DBorTx
) => (
  storeId: string
) => ResultAsync<DBStore, DBInternalError | DBStoreNotFoundError>;

export const fetchDBStoreById: FetchDBStoreById =
  (db: DBorTx) => (storeId: string) =>
    ResultAsync.fromPromise(
      db.select().from(stores).where(eq(stores.id, storeId)).limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? ok(records[0])
        : err(DBStoreNotFoundError("Store not found", { extra: { storeId } }))
    );
