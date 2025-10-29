import { ResultAsync } from "neverthrow";
import {
  createNewStaff,
  CreateNewStaffError,
  InvalidStaffError,
  Staff,
} from "../domain/staff";
import { DBStaffAlreadyExistsError } from "../infra/staff-repo.error";
import { DBInternalError } from "../infra/shared/db-error";
import { InsertDBStaff } from "../infra/staff-repo";
import { validateStaff } from "../domain/staff";
import db from "../db/db";
import { User } from "better-auth";

export type CreateStaff = (
  user: User
) => ResultAsync<
  Staff,
  | DBInternalError
  | DBStaffAlreadyExistsError
  | InvalidStaffError
  | CreateNewStaffError
>;

export const createStaff =
  (insertDBStaff: InsertDBStaff): CreateStaff =>
  (user: User) =>
    createNewStaff(user).asyncAndThen(insertDBStaff(db)).andThen(validateStaff);
