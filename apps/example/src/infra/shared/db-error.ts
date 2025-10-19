import { errorBuilder, InferError } from "../../shared/error";

export const DBInternalError = errorBuilder("DBInternalError");
export type DBInternalError = InferError<typeof DBInternalError>;
