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

export type GeneratedImageAssetError = Readonly<
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    }
>;

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
}): GeneratedImageAsset => {
  if (!input.id || !input.sessionId) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "id and sessionId are required",
    };
    throw error;
  }
  if (!input.storagePath) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "storagePath is required",
    };
    throw error;
  }
  if (!isValidUrl(input.previewUrl)) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "previewUrl must be a valid URL",
    };
    throw error;
  }
  if (input.expiresAt.getTime() <= input.createdAt.getTime()) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "expiresAt must be after createdAt",
    };
    throw error;
  }
  const asset: GeneratedImageAsset = {
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
  };
  return asset;
};

export const updateAquariumSyncStatus = (
  asset: GeneratedImageAsset,
  input: {
    status: AquariumSyncStatus;
    lastError: string | null;
    updatedAt: Date;
    attempts: number;
  },
): GeneratedImageAsset => {
  if (input.attempts < 0) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "attempts must be non-negative",
    };
    throw error;
  }
  if (input.status === "failed" && !input.lastError) {
    const error: GeneratedImageAssetError = {
      type: "invalid-argument",
      message: "failed status requires lastError",
    };
    throw error;
  }
  const updatedAsset: GeneratedImageAsset = {
    ...asset,
    aquariumSyncStatus: input.status,
    lastError: input.lastError,
    attempts: input.attempts,
    lastAttemptAt: input.updatedAt,
  };
  return updatedAsset;
};
