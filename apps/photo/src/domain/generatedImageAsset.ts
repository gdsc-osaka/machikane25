import { Err, Ok, Result } from "neverthrow";

export type AquariumSyncStatus = "pending" | "sent" | "failed" | "retrying";

export type GeneratedImageAsset = Readonly<{
  id: string;
  sessionId: string;
  storagePath: string;
  previewUrl: string;
  createdAt: Date;
  expiresAt: Date;
  aquariumSyncStatus: AquariumSyncStatus;
  lastError: string | null;
  attempts: number;
  lastAttemptAt: Date | null;
}>;

export type GeneratedImageAssetError =
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    };

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const createGeneratedImageAsset = (input: {
  id: string;
  sessionId: string;
  storagePath: string;
  previewUrl: string;
  createdAt: Date;
  expiresAt: Date;
}): Result<GeneratedImageAsset, GeneratedImageAssetError> => {
  if (!input.id || !input.sessionId) {
    return Err({
      type: "invalid-argument",
      message: "id and sessionId are required",
    });
  }
  if (!input.storagePath) {
    return Err({
      type: "invalid-argument",
      message: "storagePath is required",
    });
  }
  if (!isValidUrl(input.previewUrl)) {
    return Err({
      type: "invalid-argument",
      message: "previewUrl must be a valid URL",
    });
  }
  if (input.expiresAt.getTime() <= input.createdAt.getTime()) {
    return Err({
      type: "invalid-argument",
      message: "expiresAt must be after createdAt",
    });
  }
  return Ok({
    id: input.id,
    sessionId: input.sessionId,
    storagePath: input.storagePath,
    previewUrl: input.previewUrl,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    aquariumSyncStatus: "pending",
    lastError: null,
    attempts: 0,
    lastAttemptAt: null,
  });
};

export const updateAquariumSyncStatus = (
  asset: GeneratedImageAsset,
  input: {
    status: AquariumSyncStatus;
    lastError: string | null;
    updatedAt: Date;
    attempts: number;
  },
): Result<GeneratedImageAsset, GeneratedImageAssetError> => {
  if (input.attempts < 0) {
    return Err({
      type: "invalid-argument",
      message: "attempts must be non-negative",
    });
  }
  if (input.status === "failed" && !input.lastError) {
    return Err({
      type: "invalid-argument",
      message: "failed status requires lastError",
    });
  }
  return Ok({
    ...asset,
    aquariumSyncStatus: input.status,
    lastError: input.lastError,
    attempts: input.attempts,
    lastAttemptAt: input.updatedAt,
  });
};
