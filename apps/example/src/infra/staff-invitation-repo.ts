import {
  DBStaffInvitation,
  DBStaffInvitationForCreate,
  DBStaffInvitationForUpdate,
} from "../domain/staff-invitation";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { DBorTx } from "../db/db";
import { DBInternalError } from "./shared/db-error";
import {
  DBStaffInvitationAlreadyExistsError,
  DBStaffInvitationNotFoundError,
} from "./staff-invitation-repo.error";
import { staffInvitations } from "../db/schema/app/staff-invitations";
import { and, eq } from "drizzle-orm";

export type InsertDBStaffInvitation = (
  db: DBorTx
) => (
  staffInvitation: DBStaffInvitationForCreate
) => ResultAsync<
  DBStaffInvitation,
  DBInternalError | DBStaffInvitationAlreadyExistsError
>;

export const insertDBStaffInvitation: InsertDBStaffInvitation =
  (db) => (staffInvitation) =>
    ResultAsync.fromPromise(
      db.insert(staffInvitations).values(staffInvitation).returning(),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(
            DBStaffInvitationAlreadyExistsError(
              "Staff invitation already exists",
              { extra: { email: staffInvitation.targetEmail } }
            )
          )
    );

export type UpdateDBStaffInvitation = (
  db: DBorTx
) => (
  invitation: DBStaffInvitationForUpdate
) => ResultAsync<
  DBStaffInvitation,
  DBInternalError | DBStaffInvitationNotFoundError
>;
export const updateDBStaffInvitation: UpdateDBStaffInvitation =
  (db) => (invitation) =>
    ResultAsync.fromPromise(
      db
        .update(staffInvitations)
        .set(invitation)
        .where(eq(staffInvitations.id, invitation.id))
        .returning(),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(DBStaffInvitationNotFoundError("Invitation not found"))
    );

export type FetchDBStaffInvitationByEmailAndPending = (
  db: DBorTx
) => (
  storeId: string,
  email: string
) => ResultAsync<
  DBStaffInvitation,
  DBInternalError | DBStaffInvitationNotFoundError
>;

export const fetchDBStaffInvitationByEmailAndPending: FetchDBStaffInvitationByEmailAndPending =
  (db) => (storeId: string, email) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(staffInvitations)
        .where(
          and(
            eq(staffInvitations.storeId, storeId),
            eq(staffInvitations.targetEmail, email),
            eq(staffInvitations.status, "PENDING")
          )
        )
        .limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(
            DBStaffInvitationNotFoundError(
              "No pending invitation found for this email"
            )
          )
    );

export type FetchDBStaffInvitationByToken = (
  db: DBorTx
) => (
  token: string
) => ResultAsync<
  DBStaffInvitation,
  DBInternalError | DBStaffInvitationNotFoundError
>;

export const fetchDBStaffInvitationByToken: FetchDBStaffInvitationByToken =
  (db) => (token: string) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(staffInvitations)
        .where(eq(staffInvitations.token, token))
        .limit(1),
      DBInternalError.handle
    ).andThen((records) =>
      records.length > 0
        ? okAsync(records[0])
        : errAsync(DBStaffInvitationNotFoundError("Invitation not found"))
    );
