import {
  AcceptStaffInvitation,
  DeclineStaffInvitation,
  InviteStaffToStore,
} from "../service/staff-invitation-service";
import { ResultAsync } from "neverthrow";
import {
  CreateStaffInvitationPermissionError,
  DuplicateStaffInvitationError,
  InvalidStaffInvitationError,
  StaffInvitation,
  StaffInvitationExpiredError,
  StaffInvitationNotPendingError,
  StaffInvitationWrongEmailError,
} from "../domain/staff-invitation";
import { HTTPErrorCarrier, StatusCode } from "./error/api-error";
import { match, P } from "ts-pattern";
import { DBStaffNotFoundError } from "../infra/staff-repo.error";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import { InvalidStaffRoleError } from "../domain/store-staff";
import { DBInternalError } from "../infra/shared/db-error";
import {
  DBStaffInvitationAlreadyExistsError,
  DBStaffInvitationNotFoundError,
} from "../infra/staff-invitation-repo.error";
import { DBStoreToStaffAlreadyExistsError } from "../infra/store-to-staff-repo.error";
import { convertErrorToApiError } from "./error/api-error-utils";

export const inviteStaffToStoreController = (
  inviteStaffToStoreRes: ReturnType<InviteStaffToStore>
): ResultAsync<StaffInvitation, HTTPErrorCarrier> =>
  inviteStaffToStoreRes.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBStaffNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStaffInvitationAlreadyExistsError.is, () => StatusCode.Conflict)
        .with(DuplicateStaffInvitationError.is, () => StatusCode.Conflict)
        .with(
          CreateStaffInvitationPermissionError.is,
          () => StatusCode.Forbidden
        )
        .with(
          P.union(InvalidStaffInvitationError.is, InvalidStaffRoleError.is),
          () => StatusCode.BadRequest
        )
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const acceptStaffInvitationController = (
  res: ReturnType<AcceptStaffInvitation>
): ResultAsync<StaffInvitation, HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBStaffNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStaffInvitationNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStoreToStaffAlreadyExistsError.is, () => StatusCode.Conflict)
        .with(StaffInvitationExpiredError.is, () => StatusCode.BadRequest)
        .with(StaffInvitationNotPendingError.is, () => StatusCode.BadRequest)
        .with(StaffInvitationWrongEmailError.is, () => StatusCode.BadRequest)
        .with(
          InvalidStaffInvitationError.is,
          () => StatusCode.InternalServerError
        )
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );

export const declineStaffInvitationController = (
  res: ReturnType<DeclineStaffInvitation>
): ResultAsync<StaffInvitation, HTTPErrorCarrier> =>
  res.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(DBInternalError.is, () => StatusCode.InternalServerError)
        .with(DBStaffNotFoundError.is, () => StatusCode.NotFound)
        .with(DBStaffInvitationNotFoundError.is, () => StatusCode.NotFound)
        .with(StaffInvitationExpiredError.is, () => StatusCode.BadRequest)
        .with(StaffInvitationNotPendingError.is, () => StatusCode.BadRequest)
        .with(StaffInvitationWrongEmailError.is, () => StatusCode.BadRequest)
        .with(
          InvalidStaffInvitationError.is,
          () => StatusCode.InternalServerError
        )
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );
