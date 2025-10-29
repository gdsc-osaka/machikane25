import { DBVisit, DBVisitForCreate, DBVisitForUpdate } from "../domain/visit";
import { DBorTx } from "../db/db";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { DBInternalError } from "./shared/db-error";
import { visits } from "../db/schema/app/visits";
import { and, eq } from "drizzle-orm";
import { StoreId } from "../domain/store";
import { errorBuilder, InferError } from "../shared/error";
import { CustomerId } from "../domain/customer";

// Errors
// export const DBVisitAlreadyExistsError = errorBuilder('DBVisitAlreadyExistsError');
// export type DBVisitAlreadyExistsError = InferError<typeof DBVisitAlreadyExistsError>;
export const DBVisitNotFoundError = errorBuilder("DBVisitNotFoundError");
export type DBVisitNotFoundError = InferError<typeof DBVisitNotFoundError>;

export type InsertDBVisit = (
  db: DBorTx
) => (visit: DBVisitForCreate) => ResultAsync<DBVisit, DBInternalError>;

export const insertDBVisit: InsertDBVisit = (db) => (visit) =>
  ResultAsync.fromPromise(
    db.insert(visits).values(visit).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? okAsync(records[0])
      : errAsync(DBInternalError("Unexpected error: no records returned"))
  );

export type UpdateDBVisitById = (
  db: DBorTx
) => (
  visit: DBVisitForUpdate
) => ResultAsync<DBVisit, DBInternalError | DBVisitNotFoundError>;

export const updateDBVisitById: UpdateDBVisitById = (db) => (visit) =>
  ResultAsync.fromPromise(
    db.update(visits).set(visit).where(eq(visits.id, visit.id)).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? okAsync(records[0])
      : errAsync(DBVisitNotFoundError("Unexpected error: no records returned"))
  );

export type UpdateDBVisitByStoreIdAndCustomerId = (
  db: DBorTx
) => (
  storeId: string,
  customerId: CustomerId,
  visit: Omit<DBVisitForUpdate, "id">
) => ResultAsync<DBVisit, DBInternalError | DBVisitNotFoundError>;

export const updateDBVisitByStoreIdAndCustomerId: UpdateDBVisitByStoreIdAndCustomerId =
  (db) => (storeId, customerId, visit) =>
    ResultAsync.fromPromise(
      db
        .update(visits)
        .set(visit)
        .where(
          and(eq(visits.storeId, storeId), eq(visits.customerId, customerId))
        )
        .returning(),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(DBVisitNotFoundError("Visit not found"))
    );

export type FetchDBVisitByStoreIdAndCustomerId = (
  db: DBorTx
) => (
  storeId: StoreId,
  customerId: CustomerId
) => ResultAsync<DBVisit, DBInternalError | DBVisitNotFoundError>;

export const fetchDBVisitByStoreIdAndCustomerId: FetchDBVisitByStoreIdAndCustomerId =
  (db) => (storeId, customerId) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(visits)
        .where(
          and(eq(visits.storeId, storeId), eq(visits.customerId, customerId))
        ),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(DBVisitNotFoundError("Visit not found"))
    );
