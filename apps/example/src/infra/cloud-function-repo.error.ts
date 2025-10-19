import { errorBuilder, InferError } from "../shared/error";
import z from "zod";

export const CloudFunctionError = errorBuilder("CloudFunctionError");
export type CloudFunctionError = InferError<typeof CloudFunctionError>;

export const UploadAudioError = errorBuilder(
  "UploadAudioError",
  z.object({
    code: z.string(),
    details: z.array(z.unknown()),
  })
);
export type UploadAudioError = InferError<typeof UploadAudioError>;
