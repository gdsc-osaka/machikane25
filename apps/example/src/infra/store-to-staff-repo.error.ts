import { errorBuilder, InferError } from "../shared/error";

export const DBStoreToStaffAlreadyExistsError = errorBuilder(
  "DBStoreToStaffAlreadyExistsError"
);
export type DBStoreToStaffAlreadyExistsError = InferError<
  typeof DBStoreToStaffAlreadyExistsError
>;
