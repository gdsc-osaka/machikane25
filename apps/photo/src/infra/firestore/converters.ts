import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import {
  VisitorSession,
  VisitorSessionStatus,
  VisitorSessionStatusHistoryEntry,
} from "@/domain/visitorSession";
import {
  AquariumSyncStatus,
  GeneratedImageAsset,
} from "@/domain/generatedImageAsset";
import { PublicAccessToken } from "@/domain/publicAccessToken";

type FirestoreRecord = Record<string, unknown>;

const VISITOR_STATUSES: ReadonlyArray<VisitorSessionStatus> = [
  "capturing",
  "selecting-theme",
  "generating",
  "completed",
  "failed",
  "expired",
];

const AQUARIUM_SYNC_STATUSES: ReadonlyArray<AquariumSyncStatus> = [
  "pending",
  "sent",
  "failed",
  "retrying",
];

export type FirestoreConverterError = Readonly<{
  type: "invalid-record";
  message: string;
  details?: string;
}>;

type SnapshotData = Readonly<{
  id: string;
  data: FirestoreRecord;
}>;

const buildConverterError = (
  message: string,
  details?: string,
): FirestoreConverterError => {
  const error: FirestoreConverterError = {
    type: "invalid-record",
    message,
    details,
  };
  return error;
};

const isFirestoreConverterError = (
  value: unknown,
): value is FirestoreConverterError => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const typeValue = Reflect.get(value, "type");
  const messageValue = Reflect.get(value, "message");
  if (typeValue !== "invalid-record") {
    return false;
  }
  return typeof messageValue === "string";
};

const extractMessage = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const messageCandidate = Reflect.get(value, "message");
    if (typeof messageCandidate === "string") {
      return messageCandidate;
    }
  }
  return "Unknown error";
};

const ensureStringField = (
  record: FirestoreRecord,
  key: string,
): string => {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  throw buildConverterError(`Expected string for ${key}`);
};

const ensureOptionalStringField = (
  record: FirestoreRecord,
  key: string,
): string | null => {
  if (!(key in record) || record[key] === null) {
    return null;
  }
  return ensureStringField(record, key);
};

const ensureBooleanField = (
  record: FirestoreRecord,
  key: string,
): boolean => {
  const value = record[key];
  if (typeof value === "boolean") {
    return value;
  }
  throw buildConverterError(`Expected boolean for ${key}`);
};

const isTimestamp = (value: unknown): value is Timestamp =>
  value instanceof Timestamp;

const ensureTimestampField = (
  record: FirestoreRecord,
  key: string,
): Timestamp => {
  const value = record[key];
  if (isTimestamp(value)) {
    return value;
  }
  throw buildConverterError(`Expected Timestamp for ${key}`);
};

const ensureOptionalTimestampField = (
  record: FirestoreRecord,
  key: string,
): Timestamp | null => {
  if (!(key in record) || record[key] === null) {
    return null;
  }
  return ensureTimestampField(record, key);
};

const isDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

const ensureDateField = (value: unknown, label: string): Date => {
  if (isDate(value)) {
    return value;
  }
  throw buildConverterError(`${label} must be a Date instance`);
};

const ensureOptionalDateField = (
  value: unknown,
  label: string,
): Date | null => {
  if (value === null) {
    return null;
  }
  return ensureDateField(value, label);
};

const isVisitorSessionStatus = (
  value: unknown,
): value is VisitorSessionStatus =>
  typeof value === "string" &&
  VISITOR_STATUSES.some((status) => status === value);

const ensureVisitorSessionInput = (
  value: unknown,
): VisitorSession => {
  if (typeof value !== "object" || value === null) {
    throw new Error("VisitorSession input must be an object");
  }
  const id = Reflect.get(value, "id");
  const anonymousUid = Reflect.get(value, "anonymousUid");
  const status = Reflect.get(value, "status");
  const themeId = Reflect.get(value, "themeId");
  const originalImageRef = Reflect.get(value, "originalImageRef");
  const generatedImageRef = Reflect.get(value, "generatedImageRef");
  const publicTokenId = Reflect.get(value, "publicTokenId");
  const aquariumEventId = Reflect.get(value, "aquariumEventId");
  const createdAt = Reflect.get(value, "createdAt");
  const updatedAt = Reflect.get(value, "updatedAt");
  const expiresAt = Reflect.get(value, "expiresAt");
  const originalImageRetentionDeadline = Reflect.get(
    value,
    "originalImageRetentionDeadline",
  );
  const statusHistoryRaw = Reflect.get(value, "statusHistory");
  const failureReason = Reflect.get(value, "failureReason");

  if (typeof id !== "string" || id.length === 0) {
    throw new Error("VisitorSession id must be a non-empty string");
  }
  if (typeof anonymousUid !== "string" || anonymousUid.length === 0) {
    throw new Error("VisitorSession anonymousUid must be a non-empty string");
  }
  if (!isVisitorSessionStatus(status)) {
    throw new Error("VisitorSession status is invalid");
  }
  const ensureNullableString = (input: unknown, label: string) => {
    if (input === null || typeof input === "string") {
      return input;
    }
    throw new Error(`${label} must be a string or null`);
  };
  const normalizedThemeId = ensureNullableString(themeId, "themeId");
  const normalizedOriginalImageRef = ensureNullableString(
    originalImageRef,
    "originalImageRef",
  );
  const normalizedGeneratedImageRef = ensureNullableString(
    generatedImageRef,
    "generatedImageRef",
  );
  const normalizedPublicTokenId = ensureNullableString(
    publicTokenId,
    "publicTokenId",
  );
  const normalizedAquariumEventId = ensureNullableString(
    aquariumEventId,
    "aquariumEventId",
  );
  const normalizedFailureReason = ensureNullableString(
    failureReason,
    "failureReason",
  );

  const normalizedCreatedAt = ensureDateField(createdAt, "createdAt");
  const normalizedUpdatedAt = ensureDateField(updatedAt, "updatedAt");
  const normalizedExpiresAt = ensureDateField(expiresAt, "expiresAt");
  const normalizedOriginalRetention = ensureOptionalDateField(
    originalImageRetentionDeadline,
    "originalImageRetentionDeadline",
  );

  if (!Array.isArray(statusHistoryRaw)) {
    throw new Error("VisitorSession statusHistory must be an array");
  }
  const normalizedHistory = statusHistoryRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(
        `VisitorSession statusHistory entry at index ${index} must be an object`,
      );
    }
    const entryStatus = Reflect.get(entry, "status");
    const entryOccurredAt = Reflect.get(entry, "occurredAt");
    if (!isVisitorSessionStatus(entryStatus)) {
      throw new Error(
        `VisitorSession statusHistory entry ${index} has invalid status`,
      );
    }
    const occurredAtDate = ensureDateField(
      entryOccurredAt,
      `statusHistory[${index}].occurredAt`,
    );
    const normalizedEntry: VisitorSessionStatusHistoryEntry = {
      status: entryStatus,
      occurredAt: occurredAtDate,
    };
    return normalizedEntry;
  });

  const session: VisitorSession = {
    id,
    anonymousUid,
    status,
    themeId: normalizedThemeId,
    originalImageRef: normalizedOriginalImageRef,
    generatedImageRef: normalizedGeneratedImageRef,
    publicTokenId: normalizedPublicTokenId,
    aquariumEventId: normalizedAquariumEventId,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    expiresAt: normalizedExpiresAt,
    originalImageRetentionDeadline: normalizedOriginalRetention,
    statusHistory: normalizedHistory,
    failureReason: normalizedFailureReason,
  };
  return session;
};

const isAquariumSyncStatus = (
  value: unknown,
): value is AquariumSyncStatus =>
  typeof value === "string" &&
  AQUARIUM_SYNC_STATUSES.some((status) => status === value);

const ensureGeneratedAssetInput = (
  value: unknown,
): GeneratedImageAsset => {
  if (typeof value !== "object" || value === null) {
    throw new Error("GeneratedImageAsset input must be an object");
  }
  const id = Reflect.get(value, "id");
  const sessionId = Reflect.get(value, "sessionId");
  const storagePath = Reflect.get(value, "storagePath");
  const previewUrl = Reflect.get(value, "previewUrl");
  const createdAt = Reflect.get(value, "createdAt");
  const expiresAt = Reflect.get(value, "expiresAt");
  const aquariumSyncStatus = Reflect.get(value, "aquariumSyncStatus");
  const lastError = Reflect.get(value, "lastError");
  const attempts = Reflect.get(value, "attempts");
  const lastAttemptAt = Reflect.get(value, "lastAttemptAt");

  if (typeof id !== "string" || id.length === 0) {
    throw new Error("GeneratedImageAsset id must be a non-empty string");
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("GeneratedImageAsset sessionId must be a non-empty string");
  }
  if (typeof storagePath !== "string" || storagePath.length === 0) {
    throw new Error("GeneratedImageAsset storagePath must be a non-empty string");
  }
  if (typeof previewUrl !== "string" || previewUrl.length === 0) {
    throw new Error("GeneratedImageAsset previewUrl must be a non-empty string");
  }
  if (!isAquariumSyncStatus(aquariumSyncStatus)) {
    throw new Error("GeneratedImageAsset aquariumSyncStatus is invalid");
  }
  if (lastError !== null && typeof lastError !== "string") {
    throw new Error("GeneratedImageAsset lastError must be a string or null");
  }
  if (typeof attempts !== "number" || Number.isNaN(attempts)) {
    throw new Error("GeneratedImageAsset attempts must be a number");
  }

  const asset: GeneratedImageAsset = {
    id,
    sessionId,
    storagePath,
    previewUrl,
    createdAt: ensureDateField(createdAt, "createdAt"),
    expiresAt: ensureDateField(expiresAt, "expiresAt"),
    aquariumSyncStatus,
    lastError,
    attempts,
    lastAttemptAt: ensureOptionalDateField(lastAttemptAt, "lastAttemptAt"),
  };
  return asset;
};

const ensurePublicAccessTokenInput = (
  value: unknown,
): PublicAccessToken => {
  if (typeof value !== "object" || value === null) {
    throw new Error("PublicAccessToken input must be an object");
  }
  const id = Reflect.get(value, "id");
  const sessionId = Reflect.get(value, "sessionId");
  const isConsumed = Reflect.get(value, "isConsumed");
  const createdAt = Reflect.get(value, "createdAt");
  const expiresAt = Reflect.get(value, "expiresAt");
  const consumedAt = Reflect.get(value, "consumedAt");

  if (typeof id !== "string" || id.length === 0) {
    throw new Error("PublicAccessToken id must be a non-empty string");
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("PublicAccessToken sessionId must be a non-empty string");
  }
  if (typeof isConsumed !== "boolean") {
    throw new Error("PublicAccessToken isConsumed must be boolean");
  }
  const token: PublicAccessToken = {
    id,
    sessionId,
    isConsumed,
    createdAt: ensureDateField(createdAt, "createdAt"),
    expiresAt: ensureDateField(expiresAt, "expiresAt"),
    consumedAt: ensureOptionalDateField(consumedAt, "consumedAt"),
  };
  return token;
};

const ensureVisitorStatus = (
  record: FirestoreRecord,
  key: string,
): VisitorSessionStatus => {
  const value = record[key];
  if (typeof value === "string") {
    const matched = VISITOR_STATUSES.find((status) => status === value);
    if (matched) {
      return matched;
    }
  }
  throw buildConverterError(`Invalid visitor session status for ${key}`);
};

const ensureAquariumStatus = (
  record: FirestoreRecord,
  key: string,
): AquariumSyncStatus => {
  const value = record[key];
  if (typeof value === "string") {
    const matched = AQUARIUM_SYNC_STATUSES.find((status) => status === value);
    if (matched) {
      return matched;
    }
  }
  throw buildConverterError(`Invalid aquarium sync status for ${key}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const serializeVisitorSession = (
  session: VisitorSession,
) => ({
  anonymousUid: session.anonymousUid,
  status: session.status,
  themeId: session.themeId,
  originalImageRef: session.originalImageRef,
  generatedImageRef: session.generatedImageRef,
  publicTokenId: session.publicTokenId,
  aquariumEventId: session.aquariumEventId,
  createdAt: Timestamp.fromDate(session.createdAt),
  updatedAt: Timestamp.fromDate(session.updatedAt),
  expiresAt: Timestamp.fromDate(session.expiresAt),
  originalImageRetentionDeadline: session.originalImageRetentionDeadline
    ? Timestamp.fromDate(session.originalImageRetentionDeadline)
    : null,
  statusHistory: session.statusHistory.map((entry) => ({
    status: entry.status,
    occurredAt: Timestamp.fromDate(entry.occurredAt),
  })),
  failureReason: session.failureReason,
});

export const deserializeVisitorSession = (
  snapshot: SnapshotData,
): VisitorSession => {
  try {
    const anonymousUid = ensureStringField(snapshot.data, "anonymousUid");
    const status = ensureVisitorStatus(snapshot.data, "status");
    const themeId = ensureOptionalStringField(snapshot.data, "themeId");
    const originalImageRef = ensureOptionalStringField(
      snapshot.data,
      "originalImageRef",
    );
    const generatedImageRef = ensureOptionalStringField(
      snapshot.data,
      "generatedImageRef",
    );
    const publicTokenId = ensureOptionalStringField(
      snapshot.data,
      "publicTokenId",
    );
    const aquariumEventId = ensureOptionalStringField(
      snapshot.data,
      "aquariumEventId",
    );
    const createdAt = ensureTimestampField(snapshot.data, "createdAt");
    const updatedAt = ensureTimestampField(snapshot.data, "updatedAt");
    const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");
    const retention = ensureOptionalTimestampField(
      snapshot.data,
      "originalImageRetentionDeadline",
    );
    const failureReason = ensureOptionalStringField(
      snapshot.data,
      "failureReason",
    );
    const historyRaw = snapshot.data.statusHistory;
    if (!Array.isArray(historyRaw)) {
      throw buildConverterError("statusHistory must be an array");
    }
    const historyEntries = historyRaw.map((entry, index) => {
      if (!isRecord(entry)) {
        throw buildConverterError(
          `statusHistory entry at index ${index} must be an object`,
        );
      }
      const entryStatus = ensureVisitorStatus(entry, "status");
      const occurredAt = ensureTimestampField(entry, "occurredAt");
      const historyEntry: VisitorSessionStatusHistoryEntry = {
        status: entryStatus,
        occurredAt: occurredAt.toDate(),
      };
      return historyEntry;
    });

    const createdDate = createdAt.toDate();
    const expiresDate = expiresAt.toDate();
    if (expiresDate.getTime() <= createdDate.getTime()) {
      throw buildConverterError(
        "expiresAt must be after createdAt",
        `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
      );
    }

    const session: VisitorSession = {
      id: snapshot.id,
      anonymousUid,
      status,
      themeId,
      originalImageRef,
      generatedImageRef,
      publicTokenId,
      aquariumEventId,
      createdAt: createdDate,
      updatedAt: updatedAt.toDate(),
      expiresAt: expiresDate,
      originalImageRetentionDeadline: retention
        ? retention.toDate()
        : null,
      statusHistory: historyEntries,
      failureReason,
    };
    return session;
  } catch (error) {
    if (isFirestoreConverterError(error)) {
      throw error;
    }
    throw buildConverterError(
      "Failed to deserialize visitor session",
      extractMessage(error),
    );
  }
};

export const serializeGeneratedImageAsset = (
  asset: GeneratedImageAsset,
) => ({
  sessionId: asset.sessionId,
  storagePath: asset.storagePath,
  previewUrl: asset.previewUrl,
  aquariumSyncStatus: asset.aquariumSyncStatus,
  lastError: asset.lastError,
  attempts: asset.attempts,
  lastAttemptAt: asset.lastAttemptAt
    ? Timestamp.fromDate(asset.lastAttemptAt)
    : null,
  createdAt: Timestamp.fromDate(asset.createdAt),
  expiresAt: Timestamp.fromDate(asset.expiresAt),
});

export const deserializeGeneratedImageAsset = (
  snapshot: SnapshotData,
): GeneratedImageAsset => {
  try {
    const sessionId = ensureStringField(snapshot.data, "sessionId");
    const storagePath = ensureStringField(snapshot.data, "storagePath");
    const previewUrl = ensureStringField(snapshot.data, "previewUrl");
    const syncStatus = ensureAquariumStatus(
      snapshot.data,
      "aquariumSyncStatus",
    );
    const lastError = ensureOptionalStringField(snapshot.data, "lastError");
    const attempts = snapshot.data.attempts;
    if (typeof attempts !== "number" || Number.isNaN(attempts) || attempts < 0) {
      throw buildConverterError("attempts must be a non-negative number");
    }
    const lastAttemptAt = ensureOptionalTimestampField(
      snapshot.data,
      "lastAttemptAt",
    );
    const createdAt = ensureTimestampField(snapshot.data, "createdAt");
    const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");

    const createdDate = createdAt.toDate();
    const expiresDate = expiresAt.toDate();
    if (expiresDate.getTime() <= createdDate.getTime()) {
      throw buildConverterError(
        "expiresAt must be after createdAt",
        `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
      );
    }

    if (syncStatus === "failed" && !lastError) {
      throw buildConverterError("failed status requires lastError");
    }

    const asset: GeneratedImageAsset = {
      id: snapshot.id,
      sessionId,
      storagePath,
      previewUrl,
      aquariumSyncStatus: syncStatus,
      lastError,
      attempts,
      lastAttemptAt: lastAttemptAt ? lastAttemptAt.toDate() : null,
      createdAt: createdDate,
      expiresAt: expiresDate,
    };
    return asset;
  } catch (error) {
    if (isFirestoreConverterError(error)) {
      throw error;
    }
    throw buildConverterError(
      "Failed to deserialize generated image asset",
      extractMessage(error),
    );
  }
};

export const serializePublicAccessToken = (token: PublicAccessToken) => ({
  sessionId: token.sessionId,
  isConsumed: token.isConsumed,
  createdAt: Timestamp.fromDate(token.createdAt),
  expiresAt: Timestamp.fromDate(token.expiresAt),
  consumedAt: token.consumedAt ? Timestamp.fromDate(token.consumedAt) : null,
});

export const deserializePublicAccessToken = (
  snapshot: SnapshotData,
): PublicAccessToken => {
  try {
    const sessionId = ensureStringField(snapshot.data, "sessionId");
    const isConsumed = ensureBooleanField(snapshot.data, "isConsumed");
    const createdAt = ensureTimestampField(snapshot.data, "createdAt");
    const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");
    const consumedAt = ensureOptionalTimestampField(
      snapshot.data,
      "consumedAt",
    );

    const createdDate = createdAt.toDate();
    const expiresDate = expiresAt.toDate();
    if (expiresDate.getTime() <= createdDate.getTime()) {
      throw buildConverterError(
        "createdAt must be before expiresAt",
        `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
      );
    }

    const consumedDate = consumedAt ? consumedAt.toDate() : null;
    if (isConsumed && consumedDate === null) {
      throw buildConverterError(
        "consumed tokens require consumedAt timestamp",
      );
    }

    const token: PublicAccessToken = {
      id: snapshot.id,
      sessionId,
      isConsumed,
      createdAt: createdDate,
      expiresAt: expiresDate,
      consumedAt: consumedDate,
    };
    return token;
  } catch (error) {
    if (isFirestoreConverterError(error)) {
      throw error;
    }
    throw buildConverterError(
      "Failed to deserialize public access token",
      extractMessage(error),
    );
  }
};

const wrapFirestoreConversion = <T>(convert: () => T, context: string): T => {
  try {
    return convert();
  } catch (error) {
    const normalized = isFirestoreConverterError(error)
      ? error
      : buildConverterError(extractMessage(error));
    const message =
      normalized.details && normalized.details.length > 0
        ? `${normalized.message} (${normalized.details})`
        : normalized.message;
    throw new Error(`${context}: ${message}`);
  }
};

export const visitorSessionConverter: FirestoreDataConverter<VisitorSession> = {
  toFirestore: (session) =>
    serializeVisitorSession(ensureVisitorSessionInput(session)),
  fromFirestore: (snapshot) =>
    wrapFirestoreConversion(
      () => deserializeVisitorSession({ id: snapshot.id, data: snapshot.data() }),
      "visitorSessionConverter",
    ),
};

export const generatedImageAssetConverter: FirestoreDataConverter<GeneratedImageAsset> =
  {
    toFirestore: (asset) =>
      serializeGeneratedImageAsset(ensureGeneratedAssetInput(asset)),
    fromFirestore: (snapshot) =>
      wrapFirestoreConversion(
        () =>
          deserializeGeneratedImageAsset({
            id: snapshot.id,
            data: snapshot.data(),
          }),
        "generatedImageAssetConverter",
      ),
  };

export const publicAccessTokenConverter: FirestoreDataConverter<PublicAccessToken> =
  {
    toFirestore: (token) =>
      serializePublicAccessToken(ensurePublicAccessTokenInput(token)),
    fromFirestore: (snapshot) =>
      wrapFirestoreConversion(
        () =>
          deserializePublicAccessToken({
            id: snapshot.id,
            data: snapshot.data(),
          }),
        "publicAccessTokenConverter",
      ),
  };
