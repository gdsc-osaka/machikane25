import { ResultAsync } from "neverthrow";
import { HTTPErrorCarrier, StatusCode } from "./error/api-error";
import { match } from "ts-pattern";
import { DBInternalError } from "../infra/shared/db-error";
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
} from "../infra/customer-repo.error";
import {
  CustomerNotBelongsToStoreError,
  CustomerTosAlreadyAcceptedError,
  InvalidCustomerError,
} from "../domain/customer";
import { FirestoreInternalError } from "../infra/shared/firestore-error";
import {
  AcceptCustomerTos,
  AuthenticateCustomer,
  CheckoutCustomer,
  DeclineCustomerTos,
  FetchVisitingCustomers,
  RegisterCustomer,
} from "../service/customer-service";
import { FaceEmbeddingError } from "../infra/face-embedding-repo.error";
import { FaceAuthError } from "../infra/face-auth-repo.error";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import { convertErrorToApiError } from "./error/api-error-utils";
import { DBVisitNotFoundError } from "../infra/visit-repo";
import { CustomerSession } from "../domain/customer-session";
import { DBCustomerSessionAlreadyExistsError } from "../infra/customer-session-repo";
import { CustomerWithProfiles, InvalidProfileError } from "../domain/profile";

export const registerCustomerController = (
  registerCustomerRes: ReturnType<RegisterCustomer>
): ResultAsync<CustomerSession, HTTPErrorCarrier> =>
  registerCustomerRes.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(FaceEmbeddingError.is, () => StatusCode.InternalServerError)
        .with(FirestoreInternalError.is, () => StatusCode.InternalServerError)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .with(CustomerAlreadyExistsError.is, () => StatusCode.Conflict)
        .with(
          DBCustomerSessionAlreadyExistsError.is,
          () => StatusCode.BadRequest
        )
        .with(InvalidCustomerError.is, () => StatusCode.BadRequest)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const authenticateCustomerController = (
  faceAuthRes: ReturnType<AuthenticateCustomer>
): ResultAsync<CustomerSession, HTTPErrorCarrier> =>
  faceAuthRes.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(FaceEmbeddingError.is, () => StatusCode.InternalServerError)
        .with(FaceAuthError.is, () => StatusCode.Unauthorized)
        .with(FirestoreInternalError.is, () => StatusCode.InternalServerError)
        .with(CustomerNotFoundError.is, () => StatusCode.NotFound)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(InvalidCustomerError.is, () => StatusCode.BadRequest)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .with(
          DBCustomerSessionAlreadyExistsError.is,
          () => StatusCode.BadRequest
        )
        .with(CustomerNotBelongsToStoreError.is, () => StatusCode.Forbidden)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const checkoutCustomerController = (
  result: ReturnType<CheckoutCustomer>
): ResultAsync<void, HTTPErrorCarrier> =>
  result.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBVisitNotFoundError.is, () => StatusCode.NotFound)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const acceptCustomerTosController = (
  res: ReturnType<AcceptCustomerTos>
): ResultAsync<void, HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(CustomerNotFoundError.is, () => StatusCode.NotFound)
        .with(CustomerTosAlreadyAcceptedError.is, () => StatusCode.Conflict)
        .with(InvalidCustomerError.is, () => StatusCode.InternalServerError)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const declineCustomerTosController = (
  res: ReturnType<DeclineCustomerTos>
): ResultAsync<void, HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(FirestoreInternalError.is, () => StatusCode.InternalServerError)
        .with(CustomerNotFoundError.is, () => StatusCode.NotFound)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const fetchVisitingCustomersController = (
  res: ReturnType<FetchVisitingCustomers>
): ResultAsync<CustomerWithProfiles[], HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(InvalidCustomerError.is, () => StatusCode.InternalServerError)
        .with(InvalidProfileError.is, () => StatusCode.InternalServerError)
        .with(CustomerNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );
