import { errorBuilder, InferError } from "../shared/error";

export const FaceEmbeddingError = errorBuilder("FaceEmbeddingError");
export type FaceEmbeddingError = InferError<typeof FaceEmbeddingError>;
