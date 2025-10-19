import { errorBuilder, InferError } from "../shared/error";
import z from "zod";

export const DBStaffNotFoundError = errorBuilder(
  "DBStaffNotFoundError",
  z.union([
    z.object({ id: z.string() }),
    z.object({ userId: z.string() }),
    z.object({ storeId: z.string(), email: z.string() }),
  ])
);
export type DBStaffNotFoundError = InferError<typeof DBStaffNotFoundError>;

export const DBStaffAlreadyExistsError = errorBuilder(
  "DBStaffAlreadyExistsError"
);

export type DBStaffAlreadyExistsError = InferError<
  typeof DBStaffAlreadyExistsError
>;
