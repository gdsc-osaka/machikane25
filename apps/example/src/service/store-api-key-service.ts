import {
  createDBStoreApiKey,
  StoreApiKey,
  validateStoreApiKey,
} from "../domain/store-api-key";
import { DBInternalError } from "../infra/shared/db-error";
import {
  DBStoreApiKeyAlreadyExistsError,
  DBStoreApiKeyNotFoundError,
  FetchDBStoreApiKeysByStoreId,
  InsertDBStoreApiKey,
} from "../infra/store-api-key-repo";
import { Result, ResultAsync } from "neverthrow";
import { FetchDBStoreByPublicId } from "../infra/store-repo";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import db from "../db/db";
import { AuthUser } from "../domain/auth";
import { FetchDBStaffForStoreById } from "../infra/staff-repo";
import { asyncify, pickFirst } from "../shared/func";
import { checkStaffIsAdmin, StaffIsNotAdminError } from "../domain/staff";
import { DBStaffNotFoundError } from "../infra/staff-repo.error";
import { StoreId } from "../domain/store";

export type CreateStoreApiKey = (
  authUser: AuthUser,
  storeId: string
) => ResultAsync<
  StoreApiKey,
  | DBInternalError
  | DBStoreNotFoundError
  | DBStoreApiKeyAlreadyExistsError
  | DBStaffNotFoundError
  | StaffIsNotAdminError
>;

export const createStoreApiKey =
  (
    fetchDBStaffForStoreById: FetchDBStaffForStoreById,
    fetchDBStoreByPublicId: FetchDBStoreByPublicId,
    insertDBStoreApiKey: InsertDBStoreApiKey
  ): CreateStoreApiKey =>
  (authUser, storeId) =>
    fetchDBStoreByPublicId(db)(storeId)
      .andThen((store) =>
        ResultAsync.combine([
          asyncify(createDBStoreApiKey(store)),
          fetchDBStaffForStoreById(db)(authUser.uid, store.id).andThen(
            checkStaffIsAdmin
          ),
        ])
      )
      .map(pickFirst)
      .andThen(insertDBStoreApiKey(db))
      .andThen(validateStoreApiKey);

export type FetchStoreApiKeysByStoreId = (
  storeId: StoreId
) => ResultAsync<
  StoreApiKey[],
  DBInternalError | DBStoreApiKeyNotFoundError | DBStoreNotFoundError
>;

export const fetchStoreApiKeysByStoreId =
  (
    fetchDBStoreApiKeysByStoreId: FetchDBStoreApiKeysByStoreId,
    fetchDBStoreByPublicId: FetchDBStoreByPublicId
  ): FetchStoreApiKeysByStoreId =>
  (storeId) =>
    fetchDBStoreByPublicId(db)(storeId)
      .map((store) => store.id)
      .andThen(fetchDBStoreApiKeysByStoreId(db))
      .andThen((apiKeys) => Result.combine(apiKeys.map(validateStoreApiKey)));
