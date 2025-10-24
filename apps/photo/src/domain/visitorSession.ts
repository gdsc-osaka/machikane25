import { Err, Ok, Result } from "neverthrow";

export type VisitorSessionStatus =
  | "capturing"
  | "selecting-theme"
  | "generating"
  | "completed"
  | "failed"
  | "expired";

export type VisitorSessionStatusHistoryEntry = Readonly<{
  status: VisitorSessionStatus;
  occurredAt: Date;
}>;

export type VisitorSession = Readonly<{
  id: string;
  anonymousUid: string;
  status: VisitorSessionStatus;
  themeId: string | null;
  originalImageRef: string | null;
  generatedImageRef: string | null;
  publicTokenId: string | null;
  aquariumEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  originalImageRetentionDeadline: Date | null;
  statusHistory: ReadonlyArray<VisitorSessionStatusHistoryEntry>;
  failureReason: string | null;
}>;

export type VisitorSessionError =
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    };

const addMinutes = (value: Date, minutes: number) =>
  new Date(value.getTime() + minutes * 60_000);

const addHours = (value: Date, hours: number) =>
  new Date(value.getTime() + hours * 3_600_000);

const appendHistory = (
  history: ReadonlyArray<VisitorSessionStatusHistoryEntry>,
  entry: VisitorSessionStatusHistoryEntry,
) => [...history, entry] as const;

const withStatus = (
  session: VisitorSession,
  status: VisitorSessionStatus,
  occurredAt: Date,
): VisitorSession =>
  ({
    ...session,
    status,
    updatedAt: occurredAt,
    statusHistory: appendHistory(session.statusHistory, {
      status,
      occurredAt,
    }),
  }) satisfies VisitorSession;

export const createVisitorSession = (input: {
  id: string;
  anonymousUid: string;
  now: Date;
  ttlHours?: number;
}): Result<VisitorSession, VisitorSessionError> => {
  if (!input.id || !input.anonymousUid) {
    return Err({
      type: "invalid-argument",
      message: "id and anonymousUid are required",
    });
  }
  const ttlHours = input.ttlHours ?? 48;
  const createdAt = input.now;
  const expiresAt = addHours(createdAt, ttlHours);
  const baseHistory: ReadonlyArray<VisitorSessionStatusHistoryEntry> = [
    { status: "capturing", occurredAt: createdAt },
  ];
  return Ok({
    id: input.id,
    anonymousUid: input.anonymousUid,
    status: "capturing",
    themeId: null,
    originalImageRef: null,
    generatedImageRef: null,
    publicTokenId: null,
    aquariumEventId: null,
    createdAt,
    updatedAt: createdAt,
    expiresAt,
    originalImageRetentionDeadline: null,
    statusHistory: baseHistory,
    failureReason: null,
  });
};

export const captureOriginalImage = (
  session: VisitorSession,
  input: { storagePath: string; capturedAt: Date; retentionMinutes?: number },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status !== "capturing") {
    return Err({
      type: "invalid-transition",
      message: "Original image can only be captured during capturing status",
    });
  }
  if (!input.storagePath) {
    return Err({
      type: "invalid-argument",
      message: "storagePath must be provided",
    });
  }
  const retentionMinutes = input.retentionMinutes ?? 5;
  const capturedSession = withStatus(session, "selecting-theme", input.capturedAt);
  return Ok({
    ...capturedSession,
    originalImageRef: input.storagePath,
    originalImageRetentionDeadline: addMinutes(
      input.capturedAt,
      retentionMinutes,
    ),
  });
};

export const selectTheme = (
  session: VisitorSession,
  input: { themeId: string; selectedAt: Date },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status !== "selecting-theme") {
    return Err({
      type: "invalid-transition",
      message: "Theme selection is only allowed in selecting-theme status",
    });
  }
  if (!input.themeId) {
    return Err({
      type: "invalid-argument",
      message: "themeId must be provided",
    });
  }
  return Ok({
    ...session,
    themeId: input.themeId,
    updatedAt: input.selectedAt,
    statusHistory: appendHistory(session.statusHistory, {
      status: session.status,
      occurredAt: input.selectedAt,
    }),
  });
};

export const startGeneration = (
  session: VisitorSession,
  input: { requestedAt: Date },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status !== "selecting-theme") {
    return Err({
      type: "invalid-transition",
      message: "Generation can only start after theme selection",
    });
  }
  if (!session.themeId || !session.originalImageRef) {
    return Err({
      type: "invalid-transition",
      message:
        "Generation requires both a theme and captured original image reference",
    });
  }
  return Ok(withStatus(session, "generating", input.requestedAt));
};

export const completeGeneration = (
  session: VisitorSession,
  input: {
    generatedImageRef: string;
    completedAt: Date;
    publicTokenId: string | null;
    aquariumEventId: string | null;
  },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status !== "generating") {
    return Err({
      type: "invalid-transition",
      message: "Generation can only be completed from generating status",
    });
  }
  if (!input.generatedImageRef) {
    return Err({
      type: "invalid-argument",
      message: "generatedImageRef must be provided",
    });
  }
  const next = withStatus(session, "completed", input.completedAt);
  return Ok({
    ...next,
    generatedImageRef: input.generatedImageRef,
    publicTokenId: input.publicTokenId,
    aquariumEventId: input.aquariumEventId,
    failureReason: null,
  });
};

export const failGeneration = (
  session: VisitorSession,
  input: { failedAt: Date; reason: string | null },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status !== "generating") {
    return Err({
      type: "invalid-transition",
      message: "Failure can only be recorded while generating",
    });
  }
  const next = withStatus(session, "failed", input.failedAt);
  return Ok({
    ...next,
    failureReason: input.reason,
  });
};

export const expireSession = (
  session: VisitorSession,
  input: { expiredAt: Date },
): Result<VisitorSession, VisitorSessionError> => {
  if (session.status === "completed" || session.status === "failed") {
    return Err({
      type: "invalid-transition",
      message: "Completed or failed sessions cannot expire",
    });
  }
  if (input.expiredAt.getTime() < session.expiresAt.getTime()) {
    return Err({
      type: "invalid-argument",
      message: "expiredAt must be on or after expiresAt",
    });
  }
  return Ok(withStatus(session, "expired", input.expiredAt));
};

export const needsOriginalImageDeletion = (
  session: VisitorSession,
  now: Date,
) =>
  session.originalImageRef !== null &&
  session.originalImageRetentionDeadline !== null &&
  now.getTime() >= session.originalImageRetentionDeadline.getTime();
