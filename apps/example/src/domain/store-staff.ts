import { storesToStaffs } from "../db/schema/app/stores";
import { DBStaff, Staff } from "./staff";
import { DBStore } from "./store";
import { err, ok, Result } from "neverthrow";
import { z } from "@hono/zod-openapi";
import { errorBuilder, InferError } from "../shared/error";
import { FieldErrors } from "./shared/types";

export type DBStoreToStaff = typeof storesToStaffs.$inferSelect;
export type DBStoreToStaffForCreate = typeof storesToStaffs.$inferInsert;

export const StaffRole = z.enum(["ADMIN", "STAFF"]).openapi("StaffRole");
export type StaffRole = z.infer<typeof StaffRole>;

export type AssignAdminStaffToStore = (
  store: DBStore,
  staff: Staff
) => Result<DBStoreToStaff, never>;
export const assignAdminStaffToStore: AssignAdminStaffToStore = (
  store: DBStore,
  staff: Staff
): Result<DBStoreToStaffForCreate, never> => {
  return ok({
    storeId: store.id,
    staffId: staff.id,
    role: "ADMIN",
  });
};

export const assignStaffToStore = (
  store: DBStore,
  staff: DBStaff,
  role: StaffRole
): Result<DBStoreToStaffForCreate, never> => {
  return ok({
    storeId: store.id,
    staffId: staff.id,
    role,
  });
};

export const InvalidStaffRoleError = errorBuilder<
  "InvalidStaffRoleError",
  FieldErrors<typeof StaffRole>
>("InvalidStaffRoleError");
export type InvalidStaffRoleError = InferError<typeof InvalidStaffRoleError>;

export type ValidateStaffRole = (
  role: string
) => Result<StaffRole, InvalidStaffRoleError>;
export const validateStaffRole: ValidateStaffRole = (
  role: string
): Result<StaffRole, InvalidStaffRoleError> => {
  const res = StaffRole.safeParse(role);
  if (!res.success)
    return err(
      InvalidStaffRoleError("Invalid staff role", {
        cause: res.error,
        extra: res.error.flatten().fieldErrors,
      })
    );

  return ok(res.data);
};
