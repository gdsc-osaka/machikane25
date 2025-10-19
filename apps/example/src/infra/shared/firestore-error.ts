import { errorBuilder, InferError } from "../../shared/error";

export const FirestoreInternalError = errorBuilder("FirestoreInternalError");
export type FirestoreInternalError = InferError<typeof FirestoreInternalError>;
