import { DBInternalError } from "../../infra/shared/db-error";
import {
  DBStoreAlreadyExistsError,
  DBStoreNotFoundError,
} from "../../infra/store-repo.error";
import { ApiError, ApiErrorCode } from "./api-error";
import { BaseError, BaseTag } from "../../shared/error";
import { FaceEmbeddingError } from "../../infra/face-embedding-repo.error";
import { FirestoreInternalError } from "../../infra/shared/firestore-error";
import {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
} from "../../infra/customer-repo.error";
import {
  CustomerNotBelongsToStoreError,
  CustomerTosAlreadyAcceptedError,
  InvalidCustomerError,
} from "../../domain/customer";
import { FaceAuthError } from "../../infra/face-auth-repo.error";
import { DBStaffNotFoundError } from "../../infra/staff-repo.error";
import {
  DBStaffInvitationAlreadyExistsError,
  DBStaffInvitationNotFoundError,
} from "../../infra/staff-invitation-repo.error";
import {
  CreateStaffInvitationPermissionError,
  DuplicateStaffInvitationError,
  InvalidStaffInvitationError,
  StaffInvitationExpiredError,
  StaffInvitationNotPendingError,
  StaffInvitationWrongEmailError,
} from "../../domain/staff-invitation";
import { InvalidStaffRoleError } from "../../domain/store-staff";
import { DBStoreToStaffAlreadyExistsError } from "../../infra/store-to-staff-repo.error";
import { CreateNewStoreError, InvalidStoreError } from "../../domain/store";
import { InvalidStaffError, StaffIsNotAdminError } from "../../domain/staff";
import { DBVisitNotFoundError } from "../../infra/visit-repo";
import {
  DBStoreApiKeyAlreadyExistsError,
  DBStoreApiKeyNotFoundError,
} from "../../infra/store-api-key-repo";
import {
  CloudFunctionError,
  UploadAudioError,
} from "../../infra/cloud-function-repo.error";
import { InvalidProfileError } from "../../domain/profile";
import { DBCustomerSessionAlreadyExistsError } from "../../infra/customer-session-repo";

export const errorCodeMap = {
  [DBInternalError._tag]: "internal/database_error",
  [FirestoreInternalError._tag]: "internal/firestore_error",
  // store
  [DBStoreNotFoundError._tag]: "store/not_found",
  [DBStoreAlreadyExistsError._tag]: "store/already_exists",
  [CreateNewStoreError._tag]: "store/invalid_store_id",
  [InvalidStoreError._tag]: "store/invalid",
  // customer
  [CustomerAlreadyExistsError._tag]: "customer/already_exists",
  [CustomerNotFoundError._tag]: "customer/not_found",
  [InvalidCustomerError._tag]: "customer/invalid",
  [CustomerNotBelongsToStoreError._tag]: "customer/not_belongs_to_store",
  [CustomerTosAlreadyAcceptedError._tag]: "customer/tos_already_accepted",
  [FaceAuthError._tag]: "customer/face_auth_error",
  [FaceEmbeddingError._tag]: "face_embedding/error",
  // customer_session
  [DBCustomerSessionAlreadyExistsError._tag]: "customer_session/already_exists",
  // staff
  [DBStaffNotFoundError._tag]: "staff/not_found",
  [InvalidStaffError._tag]: "staff/invalid",
  [InvalidStaffRoleError._tag]: "staff/invalid_role",
  [DBStoreToStaffAlreadyExistsError._tag]: "staff/already_exists_in_store",
  [StaffIsNotAdminError._tag]: "staff/is_not_admin",
  // staff invitation
  [DBStaffInvitationNotFoundError._tag]: "staff_invitation/not_found",
  [DBStaffInvitationAlreadyExistsError._tag]: "staff_invitation/already_exists",
  [DuplicateStaffInvitationError._tag]: "staff_invitation/duplicate",
  [CreateStaffInvitationPermissionError._tag]:
    "staff_invitation/permission_error",
  [StaffInvitationExpiredError._tag]: "staff_invitation/expired",
  [StaffInvitationNotPendingError._tag]: "staff_invitation/not_pending",
  [StaffInvitationWrongEmailError._tag]: "staff_invitation/wrong_email",
  [InvalidStaffInvitationError._tag]: "staff_invitation/invalid",
  // visit
  [DBVisitNotFoundError._tag]: "visit/not_found",
  // store api key
  [DBStoreApiKeyAlreadyExistsError._tag]: "store_api_key/already_exists",
  [DBStoreApiKeyNotFoundError._tag]: "store_api_key/not_found",
  // profile
  [CloudFunctionError._tag]: "cloud_function/error",
  [UploadAudioError._tag]: "cloud_function/upload_audio_error",
  [InvalidProfileError._tag]: "profile/invalid",
} satisfies Record<BaseTag, ApiErrorCode>;
type ErrorCodeMap = typeof errorCodeMap;

export const convertErrorToApiError = <Tag extends keyof ErrorCodeMap>(
  // FIXME: any を使わないと FieldError が通らない.
  //  BaseError<Tag, any> ではなく全エラーの Union を使う?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: BaseError<Tag, any>
): ApiError<ErrorCodeMap[Tag]> => ({
  message: error.message,
  code: errorCodeMap[error._tag],
  details: error.extra ? [error.extra] : [],
});
