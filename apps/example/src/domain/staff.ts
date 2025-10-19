import { staffs } from "../db/schema/app/stores";
import { FieldErrors, ForUpdate } from "./shared/types";
import { z } from "@hono/zod-openapi";
import { Timestamp, toTimestamp } from "./timestamp";
import { Uid } from "./auth";
import { errorBuilder, InferError } from "../shared/error";
import { err, ok, Result } from "neverthrow";
import { User } from "better-auth";
import { DBStoreToStaff, StaffRole } from "./store-staff";

export type DBStaff = typeof staffs.$inferSelect;
export type DBStaffForCreate = typeof staffs.$inferInsert;
export type DBStaffForUpdate = ForUpdate<DBStaff>;

export type DBStaffForStore = DBStaff & Pick<DBStoreToStaff, "role">;

export const StaffId = z.string().min(1).brand<"STAFF_ID">();
export type StaffId = z.infer<typeof StaffId>;

export const Staff = z
  .object({
    id: StaffId,
    userId: Uid,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .brand<"STAFF">()
  .openapi("Staff");
export type Staff = z.infer<typeof Staff>;

export const StaffForStore = Staff.and(
  z.object({
    role: StaffRole,
  })
);
export type StaffForStore = z.infer<typeof StaffForStore>;

export const InvalidStaffError = errorBuilder<
  "InvalidStaffError",
  FieldErrors<typeof Staff>
>("InvalidStaffError");
export type InvalidStaffError = InferError<typeof InvalidStaffError>;

export type ValidateStaff = (
  staff: DBStaff
) => Result<Staff, InvalidStaffError>;
export const validateStaff: ValidateStaff = (
  staff: DBStaff
): Result<Staff, InvalidStaffError> => {
  const res = Staff.safeParse({
    id: staff.id as StaffId,
    userId: staff.userId as Uid,
    createdAt: toTimestamp(staff.createdAt),
    updatedAt: toTimestamp(staff.updatedAt),
  });

  if (res.success) return ok(res.data);

  return err(
    InvalidStaffError("Invalid staff data", {
      cause: res.error,
      extra: res.error.flatten().fieldErrors,
    })
  );
};

export type ValidateStaffs = (
  staffs: DBStaff[]
) => Result<Staff[], InvalidStaffError>;
export const validateStaffs: ValidateStaffs = (
  staffs: DBStaff[]
): Result<Staff[], InvalidStaffError> =>
  Result.combine(staffs.map(validateStaff));

// validate StaffForStore
export const InvalidStaffForStoreError = errorBuilder<
  "InvalidStaffForStoreError",
  FieldErrors<typeof StaffForStore>
>("InvalidStaffForStoreError");
export type InvalidStaffForStoreError = InferError<
  typeof InvalidStaffForStoreError
>;

export type ValidateStaffForStore = (
  staff: DBStaffForStore
) => Result<StaffForStore, InvalidStaffForStoreError>;

export const validateStaffForStore: ValidateStaffForStore = (
  staff: DBStaffForStore
): Result<StaffForStore, InvalidStaffForStoreError> => {
  const res = StaffForStore.safeParse({
    id: staff.id as StaffId,
    userId: staff.userId as Uid,
    createdAt: toTimestamp(staff.createdAt),
    updatedAt: toTimestamp(staff.updatedAt),
    role: staff.role,
  });

  if (res.success) return ok(res.data);

  return err(
    InvalidStaffForStoreError("Invalid staff data for store", {
      cause: res.error,
      extra: res.error.flatten().fieldErrors,
    })
  );
};

export const StaffIsNotAdminError = errorBuilder("StaffIsNotAdminError");
export type StaffIsNotAdminError = InferError<typeof StaffIsNotAdminError>;

export const checkStaffIsAdmin = (
  staff: DBStaffForStore
): Result<void, StaffIsNotAdminError> => {
  if (staff.role !== "ADMIN") {
    return err(StaffIsNotAdminError("Staff is not admin"));
  }
  return ok(undefined);
};

export const CreateNewStaffError = errorBuilder(
  "CreateNewStaffError",
  z.object({
    user: z.custom<User>(),
  })
);
export type CreateNewStaffError = InferError<typeof CreateNewStaffError>;

export type CreateNewStaff = (
  user: User
) => Result<DBStaffForCreate, CreateNewStaffError>;

export const createNewStaff: CreateNewStaff = (
  user: User
): Result<DBStaffForCreate, CreateNewStaffError> => {
  if (typeof user.id !== "string" || user.id.length === 0) {
    return err(
      CreateNewStaffError(
        `User id must be string type and not empty, but got ${user.id}`,
        {
          extra: { user },
        }
      )
    );
  }

  return ok({
    userId: user.id,
    email: user.email,
  });
};
