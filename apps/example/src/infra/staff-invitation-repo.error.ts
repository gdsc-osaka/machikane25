import { errorBuilder, InferError } from "../shared/error";

export const DBStaffInvitationAlreadyExistsError = errorBuilder<
  "DBStaffInvitationAlreadyExistsError",
  {
    email?: string;
  }
>("DBStaffInvitationAlreadyExistsError");
export type DBStaffInvitationAlreadyExistsError = InferError<
  typeof DBStaffInvitationAlreadyExistsError
>;

export const DBStaffInvitationNotFoundError = errorBuilder(
  "DBStaffInvitationNotFoundError"
);
export type DBStaffInvitationNotFoundError = InferError<
  typeof DBStaffInvitationNotFoundError
>;
