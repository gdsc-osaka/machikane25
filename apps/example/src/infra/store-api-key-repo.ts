import { DBStoreApiKey, DBStoreApiKeyForCreate } from "../domain/store-api-key";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { DBorTx } from "../db/db";
import { DBInternalError } from "./shared/db-error";
import { errorBuilder, InferError } from "../shared/error";
import { storeApiKeys } from "../db/schema/app/store-api-keys";
import { eq } from "drizzle-orm";

export const DBStoreApiKeyAlreadyExistsError = errorBuilder(
  "DBStoreApiKeyAlreadyExistsError"
);
export type DBStoreApiKeyAlreadyExistsError = InferError<
  typeof DBStoreApiKeyAlreadyExistsError
>;
export const DBStoreApiKeyNotFoundError = errorBuilder(
  "DBStoreApiKeyNotFoundError"
);
export type DBStoreApiKeyNotFoundError = InferError<
  typeof DBStoreApiKeyNotFoundError
>;

export type InsertDBStoreApiKey = (
  db: DBorTx
) => (
  storeApiKey: DBStoreApiKeyForCreate
) => ResultAsync<
  DBStoreApiKey,
  DBInternalError | DBStoreApiKeyAlreadyExistsError
>;

export const insertDBStoreApiKey: InsertDBStoreApiKey = (db) => (storeApiKey) =>
  ResultAsync.fromPromise(
    db.insert(storeApiKeys).values(storeApiKey).returning(),
    DBInternalError.handle
  ).andThen((records) =>
    records.length > 0
      ? okAsync(records[0])
      : errAsync(
          DBStoreApiKeyAlreadyExistsError("Store API key already exists")
        )
  );

export type FetchDBStoreApiKeyByApiKey = (
  db: DBorTx
) => (
  apiKey: string
) => ResultAsync<DBStoreApiKey, DBInternalError | DBStoreApiKeyNotFoundError>;

export const fetchDBStoreApiKeyByApiKey: FetchDBStoreApiKeyByApiKey =
  (db) => (apiKey) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(storeApiKeys)
        .where(eq(storeApiKeys.apiKey, apiKey))
        .limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(DBStoreApiKeyNotFoundError("Store API key not found"))
    );

export type FetchDBStoreApiKeysByStoreId = (
  db: DBorTx
) => (
  storeId: string
) => ResultAsync<DBStoreApiKey[], DBInternalError | DBStoreApiKeyNotFoundError>;

export const fetchDBStoreApiKeysByStoreId: FetchDBStoreApiKeysByStoreId =
  (db) => (storeId) =>
    ResultAsync.fromPromise(
      db.select().from(storeApiKeys).where(eq(storeApiKeys.storeId, storeId)),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records)
        : errAsync(DBStoreApiKeyNotFoundError("Store API keys not found"))
    );
