import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import { Err, Ok, Result } from "neverthrow";
import { VisitorSession, VisitorSessionStatus } from "@/domain/visitorSession";
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

export type FirestoreConverterError = {
  type: "invalid-record";
  message: string;
  details?: string;
};

type SnapshotData = Readonly<{
  id: string;
  data: FirestoreRecord;
}>;

const ensureStringField = (
  record: FirestoreRecord,
  key: string,
): Result<string, FirestoreConverterError> => {
  const value = record[key];
  return typeof value === "string"
    ? Ok(value)
    : Err({
        type: "invalid-record",
        message: `Expected string for ${key}`,
      });
};

const ensureOptionalStringField = (
  record: FirestoreRecord,
  key: string,
): Result<string | null, FirestoreConverterError> => {
  if (!(key in record) || record[key] === null) {
    return Ok(null);
  }
  return ensureStringField(record, key);
};

const ensureBooleanField = (
  record: FirestoreRecord,
  key: string,
): Result<boolean, FirestoreConverterError> => {
  const value = record[key];
  return typeof value === "boolean"
    ? Ok(value)
    : Err({
        type: "invalid-record",
        message: `Expected boolean for ${key}`,
      });
};

const isTimestamp = (value: unknown): value is Timestamp =>
  value instanceof Timestamp;

const ensureTimestampField = (
  record: FirestoreRecord,
  key: string,
): Result<Timestamp, FirestoreConverterError> => {
  const value = record[key];
  return isTimestamp(value)
    ? Ok(value)
    : Err({
        type: "invalid-record",
        message: `Expected Timestamp for ${key}`,
      });
};

const ensureOptionalTimestampField = (
  record: FirestoreRecord,
  key: string,
): Result<Timestamp | null, FirestoreConverterError> => {
  if (!(key in record) || record[key] === null) {
    return Ok(null);
  }
  return ensureTimestampField(record, key);
};

const ensureVisitorStatus = (
  record: FirestoreRecord,
  key: string,
): Result<VisitorSessionStatus, FirestoreConverterError> => {
  const value = record[key];
  if (
    typeof value === "string" &&
    VISITOR_STATUSES.some((status) => status === value)
  ) {
    return Ok(value);
  }
  return Err({
    type: "invalid-record",
    message: `Invalid visitor session status for ${key}`,
  });
};

const ensureAquariumStatus = (
  record: FirestoreRecord,
  key: string,
): Result<AquariumSyncStatus, FirestoreConverterError> => {
  const value = record[key];
  if (
    typeof value === "string" &&
    AQUARIUM_SYNC_STATUSES.some((status) => status === value)
  ) {
    return Ok(value);
  }
  return Err({
    type: "invalid-record",
    message: `Invalid aquarium sync status for ${key}`,
  });
};

const mapResultArray = <T, E>(
  items: ReadonlyArray<T>,
  mapper: (item: T, index: number) => Result<E, FirestoreConverterError>,
): Result<ReadonlyArray<E>, FirestoreConverterError> => {
  const mapped: E[] = [];
  for (const [index, item] of items.entries()) {
    const result = mapper(item, index);
    if (result.isErr()) {
      return result;
    }
    mapped.push(result.value);
  }
  return Ok(mapped);
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
): Result<VisitorSession, FirestoreConverterError> => {
  const anonymousUid = ensureStringField(snapshot.data, "anonymousUid");
  if (anonymousUid.isErr()) return anonymousUid;

  const status = ensureVisitorStatus(snapshot.data, "status");
  if (status.isErr()) return status;

  const themeId = ensureOptionalStringField(snapshot.data, "themeId");
  if (themeId.isErr()) return themeId;

  const originalImageRef = ensureOptionalStringField(
    snapshot.data,
    "originalImageRef",
  );
  if (originalImageRef.isErr()) return originalImageRef;

  const generatedImageRef = ensureOptionalStringField(
    snapshot.data,
    "generatedImageRef",
  );
  if (generatedImageRef.isErr()) return generatedImageRef;

  const publicTokenId = ensureOptionalStringField(
    snapshot.data,
    "publicTokenId",
  );
  if (publicTokenId.isErr()) return publicTokenId;

  const aquariumEventId = ensureOptionalStringField(
    snapshot.data,
    "aquariumEventId",
  );
  if (aquariumEventId.isErr()) return aquariumEventId;

  const createdAt = ensureTimestampField(snapshot.data, "createdAt");
  if (createdAt.isErr()) return createdAt;

  const updatedAt = ensureTimestampField(snapshot.data, "updatedAt");
  if (updatedAt.isErr()) return updatedAt;

  const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");
  if (expiresAt.isErr()) return expiresAt;

  const retention = ensureOptionalTimestampField(
    snapshot.data,
    "originalImageRetentionDeadline",
  );
  if (retention.isErr()) return retention;

  const failureReason = ensureOptionalStringField(
    snapshot.data,
    "failureReason",
  );
  if (failureReason.isErr()) return failureReason;

  const historyRaw = snapshot.data.statusHistory;
  if (!Array.isArray(historyRaw)) {
    return Err({
      type: "invalid-record",
      message: "statusHistory must be an array",
    });
  }

  const history = mapResultArray(historyRaw, (entry, index) => {
    if (!isRecord(entry)) {
      return Err({
        type: "invalid-record",
        message: `statusHistory entry at index ${index} must be an object`,
      });
    }
    const entryStatus = ensureVisitorStatus(entry, "status");
    if (entryStatus.isErr()) return entryStatus;
    const occurredAt = ensureTimestampField(entry, "occurredAt");
    if (occurredAt.isErr()) return occurredAt;
    return Ok({
      status: entryStatus.value,
      occurredAt: occurredAt.value.toDate(),
    });
  });
  if (history.isErr()) return history;

  const createdDate = createdAt.value.toDate();
  const expiresDate = expiresAt.value.toDate();
  if (expiresDate.getTime() <= createdDate.getTime()) {
    return Err({
      type: "invalid-record",
      message: "expiresAt must be after createdAt",
      details: `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
    });
  }

  return Ok({
    id: snapshot.id,
    anonymousUid: anonymousUid.value,
    status: status.value,
    themeId: themeId.value,
    originalImageRef: originalImageRef.value,
    generatedImageRef: generatedImageRef.value,
    publicTokenId: publicTokenId.value,
    aquariumEventId: aquariumEventId.value,
    createdAt: createdDate,
    updatedAt: updatedAt.value.toDate(),
    expiresAt: expiresDate,
    originalImageRetentionDeadline: retention.value
      ? retention.value.toDate()
      : null,
    statusHistory: history.value,
    failureReason: failureReason.value,
  });
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
): Result<GeneratedImageAsset, FirestoreConverterError> => {
  const sessionId = ensureStringField(snapshot.data, "sessionId");
  if (sessionId.isErr()) return sessionId;

  const storagePath = ensureStringField(snapshot.data, "storagePath");
  if (storagePath.isErr()) return storagePath;

  const previewUrl = ensureStringField(snapshot.data, "previewUrl");
  if (previewUrl.isErr()) return previewUrl;

  const syncStatus = ensureAquariumStatus(
    snapshot.data,
    "aquariumSyncStatus",
  );
  if (syncStatus.isErr()) return syncStatus;

  const lastError = ensureOptionalStringField(snapshot.data, "lastError");
  if (lastError.isErr()) return lastError;

  const attempts = snapshot.data.attempts;
  if (typeof attempts !== "number" || Number.isNaN(attempts) || attempts < 0) {
    return Err({
      type: "invalid-record",
      message: "attempts must be a non-negative number",
    });
  }

  const lastAttemptAt = ensureOptionalTimestampField(
    snapshot.data,
    "lastAttemptAt",
  );
  if (lastAttemptAt.isErr()) return lastAttemptAt;

  const createdAt = ensureTimestampField(snapshot.data, "createdAt");
  if (createdAt.isErr()) return createdAt;

  const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");
  if (expiresAt.isErr()) return expiresAt;

  const createdDate = createdAt.value.toDate();
  const expiresDate = expiresAt.value.toDate();
  if (expiresDate.getTime() <= createdDate.getTime()) {
    return Err({
      type: "invalid-record",
      message: "expiresAt must be after createdAt",
      details: `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
    });
  }

  if (syncStatus.value === "failed" && !lastError.value) {
    return Err({
      type: "invalid-record",
      message: "failed status requires lastError",
    });
  }

  return Ok({
    id: snapshot.id,
    sessionId: sessionId.value,
    storagePath: storagePath.value,
    previewUrl: previewUrl.value,
    aquariumSyncStatus: syncStatus.value,
    lastError: lastError.value,
    attempts,
    lastAttemptAt: lastAttemptAt.value
      ? lastAttemptAt.value.toDate()
      : null,
    createdAt: createdDate,
    expiresAt: expiresDate,
  });
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
): Result<PublicAccessToken, FirestoreConverterError> => {
  const sessionId = ensureStringField(snapshot.data, "sessionId");
  if (sessionId.isErr()) return sessionId;

  const isConsumed = ensureBooleanField(snapshot.data, "isConsumed");
  if (isConsumed.isErr()) return isConsumed;

  const createdAt = ensureTimestampField(snapshot.data, "createdAt");
  if (createdAt.isErr()) return createdAt;

  const expiresAt = ensureTimestampField(snapshot.data, "expiresAt");
  if (expiresAt.isErr()) return expiresAt;

  const consumedAt = ensureOptionalTimestampField(
    snapshot.data,
    "consumedAt",
  );
  if (consumedAt.isErr()) return consumedAt;

  const createdDate = createdAt.value.toDate();
  const expiresDate = expiresAt.value.toDate();
  if (expiresDate.getTime() <= createdDate.getTime()) {
    return Err({
      type: "invalid-record",
      message: "createdAt must be before expiresAt",
      details: `expiresAt=${expiresDate.toISOString()}, createdAt=${createdDate.toISOString()}`,
    });
  }

  const consumedDate = consumedAt.value
    ? consumedAt.value.toDate()
    : null;
  if (isConsumed.value && consumedDate === null) {
    return Err({
      type: "invalid-record",
      message: "consumed tokens require consumedAt timestamp",
    });
  }

  return Ok({
    id: snapshot.id,
    sessionId: sessionId.value,
    isConsumed: isConsumed.value,
    createdAt: createdDate,
    expiresAt: expiresDate,
    consumedAt: consumedDate,
  });
};

const convertOrThrow = <T>(
  result: Result<T, FirestoreConverterError>,
  context: string,
) => {
  if (result.isErr()) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.value;
};

export const visitorSessionConverter: FirestoreDataConverter<VisitorSession> = {
  toFirestore: (session) => serializeVisitorSession(session),
  fromFirestore: (snapshot) =>
    convertOrThrow(
      deserializeVisitorSession({ id: snapshot.id, data: snapshot.data() }),
      "visitorSessionConverter",
    ),
};

export const generatedImageAssetConverter: FirestoreDataConverter<GeneratedImageAsset> =
  {
    toFirestore: (asset) => serializeGeneratedImageAsset(asset),
    fromFirestore: (snapshot) =>
      convertOrThrow(
        deserializeGeneratedImageAsset({
          id: snapshot.id,
          data: snapshot.data(),
        }),
        "generatedImageAssetConverter",
      ),
  };

export const publicAccessTokenConverter: FirestoreDataConverter<PublicAccessToken> =
  {
    toFirestore: (token) => serializePublicAccessToken(token),
    fromFirestore: (snapshot) =>
      convertOrThrow(
        deserializePublicAccessToken({
          id: snapshot.id,
          data: snapshot.data(),
        }),
        "publicAccessTokenConverter",
      ),
  };
