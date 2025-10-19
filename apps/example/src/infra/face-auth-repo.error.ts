import { errorBuilder, InferError } from "../shared/error";

export const FaceAuthError = errorBuilder("FaceAuthError");
export type FaceAuthError = InferError<typeof FaceAuthError>;
