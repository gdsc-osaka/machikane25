import {
  CreateStoreApiKey,
  FetchStoreApiKeysByStoreId,
} from "../service/store-api-key-service";
import { ResultAsync } from "neverthrow";
import { StoreApiKey } from "../domain/store-api-key";
import { HTTPErrorCarrier, StatusCode } from "./error/api-error";
import { match } from "ts-pattern";
import { DBInternalError } from "../infra/shared/db-error";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import {
  DBStoreApiKeyAlreadyExistsError,
  DBStoreApiKeyNotFoundError,
} from "../infra/store-api-key-repo";
import { convertErrorToApiError } from "./error/api-error-utils";
import { DBStaffNotFoundError } from "../infra/staff-repo.error";
import { StaffIsNotAdminError } from "../domain/staff";

export const createStoreApiKeyController = (
  res: ReturnType<CreateStoreApiKey>
): ResultAsync<StoreApiKey, HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStaffNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreApiKeyAlreadyExistsError.is, () => StatusCode.Conflict)
        .with(StaffIsNotAdminError.is, () => StatusCode.BadRequest)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const fetchStoreApiKeysByStoreIdController = (
  res: ReturnType<FetchStoreApiKeysByStoreId>
): ResultAsync<StoreApiKey[], HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBStoreApiKeyNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );
