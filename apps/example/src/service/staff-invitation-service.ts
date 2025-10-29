import { AuthUser } from "../domain/auth";
import db from "../db/db";
import { okAsync, Result, ResultAsync } from "neverthrow";
import { FetchDBStoreById, FetchDBStoreByPublicId } from "../infra/store-repo";
import { RunTransaction } from "../infra/transaction";
import {
  assignStaffToStore,
  InvalidStaffRoleError,
  validateStaffRole,
} from "../domain/store-staff";
import {
  FetchDBStaffByUserId,
  FetchDBStaffForStoreById,
} from "../infra/staff-repo";
import {
  checkDuplicateStaffInvitation,
  checkValidityOfStaffInvitation,
  createAcceptedStaffInvitation,
  createDeclinedStaffInvitation,
  createStaffInvitation,
  CreateStaffInvitationPermissionError,
  DuplicateStaffInvitationError,
  InvalidStaffInvitationError,
  StaffInvitation,
  StaffInvitationExpiredError,
  StaffInvitationNotPendingError,
  StaffInvitationWrongEmailError,
  validateStaffInvitation,
} from "../domain/staff-invitation";
import {
  FetchDBStaffInvitationByEmailAndPending,
  FetchDBStaffInvitationByToken,
  InsertDBStaffInvitation,
  UpdateDBStaffInvitation,
} from "../infra/staff-invitation-repo";
import { DBInternalError } from "../infra/shared/db-error";
import { DBStaffNotFoundError } from "../infra/staff-repo.error";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import {
  DBStaffInvitationAlreadyExistsError,
  DBStaffInvitationNotFoundError,
} from "../infra/staff-invitation-repo.error";
import { InsertDBStoreToStaff } from "../infra/store-to-staff-repo";
import { DBStoreToStaffAlreadyExistsError } from "../infra/store-to-staff-repo.error";

export type InviteStaffToStore = (
  authUser: AuthUser,
  storeId: string,
  targetEmail: string,
  targetRole: string
) => ResultAsync<
  StaffInvitation,
  | DBInternalError
  | DBStaffNotFoundError
  | DBStoreNotFoundError
  | DBStaffInvitationAlreadyExistsError
  | DuplicateStaffInvitationError
  | CreateStaffInvitationPermissionError
  | InvalidStaffInvitationError
  | InvalidStaffRoleError
>;

export const inviteStaffToStore =
  (
    runTransaction: RunTransaction,
    fetchDBStaffForStoreById: FetchDBStaffForStoreById,
    fetchDBStoreByPublicId: FetchDBStoreByPublicId,
    fetchDBStaffInvitationByEmailAndPending: FetchDBStaffInvitationByEmailAndPending,
    insertDBStaffInvitation: InsertDBStaffInvitation
  ): InviteStaffToStore =>
  (
    authUser: AuthUser,
    storeId: string,
    targetEmail: string,
    targetRole: string
  ) =>
    runTransaction(db)((tx) =>
      fetchDBStoreByPublicId(tx)(storeId)
        .andThen((store) =>
          ResultAsync.combine([
            okAsync(store),
            fetchDBStaffForStoreById(tx)(authUser.uid, store.id),
            checkDuplicateStaffInvitation(
              fetchDBStaffInvitationByEmailAndPending(tx)(store.id, targetEmail)
            ),
          ])
        )
        .andThen(([store, staff]) =>
          validateStaffRole(targetRole).andThen((targetRole) =>
            createStaffInvitation(store, staff, targetEmail, targetRole)
          )
        )
        .andThen(insertDBStaffInvitation(tx))
        .andThen(validateStaffInvitation)
    );

export type AcceptStaffInvitation = (
  authUser: AuthUser,
  token: string
) => ResultAsync<
  StaffInvitation,
  | DBInternalError
  | DBStaffNotFoundError
  | DBStoreNotFoundError
  | DBStaffInvitationNotFoundError
  | DBStoreToStaffAlreadyExistsError
  | StaffInvitationExpiredError
  | StaffInvitationNotPendingError
  | StaffInvitationWrongEmailError
  | InvalidStaffInvitationError
>;

export const acceptStaffInvitation =
  (
    runTransaction: RunTransaction,
    fetchDBStaffInvitationByToken: FetchDBStaffInvitationByToken,
    fetchDBStaffByUserId: FetchDBStaffByUserId,
    fetchDBStoreById: FetchDBStoreById,
    insertDBStoreToStaff: InsertDBStoreToStaff,
    updateDBStaffInvitation: UpdateDBStaffInvitation
  ): AcceptStaffInvitation =>
  (authUser: AuthUser, token: string) =>
    runTransaction(db)((tx) =>
      ResultAsync.combine([
        fetchDBStaffInvitationByToken(tx)(token).andThen((invitation) =>
          fetchDBStoreById(tx)(invitation.storeId).map((store) => ({
            invitation,
            store,
          }))
        ),
        fetchDBStaffByUserId(tx)(authUser.uid),
      ])
        .andThen(([{ invitation, store }, staff]) =>
          Result.combine([
            assignStaffToStore(store, staff, invitation.role),
            createAcceptedStaffInvitation(invitation),
            checkValidityOfStaffInvitation(invitation, staff),
          ])
        )
        .andThen(([staffToStore, staffInvitation]) =>
          ResultAsync.combine([
            updateDBStaffInvitation(tx)(staffInvitation),
            insertDBStoreToStaff(tx)(staffToStore),
          ])
        )
        .andThen(([newStaffInvitation]) =>
          validateStaffInvitation(newStaffInvitation)
        )
    );

export type DeclineStaffInvitation = (
  authUser: AuthUser,
  token: string
) => ResultAsync<
  StaffInvitation,
  | DBInternalError
  | DBStaffNotFoundError
  | DBStaffInvitationNotFoundError
  | StaffInvitationExpiredError
  | StaffInvitationNotPendingError
  | StaffInvitationWrongEmailError
  | InvalidStaffInvitationError
>;

export const declineStaffInvitation =
  (
    runTransaction: RunTransaction,
    fetchDBStaffInvitationByToken: FetchDBStaffInvitationByToken,
    fetchDBStaffByUserId: FetchDBStaffByUserId,
    updateDBStaffInvitation: UpdateDBStaffInvitation
  ): DeclineStaffInvitation =>
  (authUser: AuthUser, token: string) =>
    runTransaction(db)((tx) =>
      ResultAsync.combine([
        fetchDBStaffInvitationByToken(tx)(token),
        fetchDBStaffByUserId(tx)(authUser.uid),
      ])
        .andThen(([invitation, staff]) =>
          Result.combine([
            createDeclinedStaffInvitation(invitation),
            checkValidityOfStaffInvitation(invitation, staff),
          ])
        )
        .andThen(([invitation]) => updateDBStaffInvitation(tx)(invitation))
        .andThen(validateStaffInvitation)
    );
