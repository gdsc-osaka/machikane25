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

export type VisitorSessionError = Readonly<
  | {
      type: "invalid-argument";
      message: string;
    }
  | {
      type: "invalid-transition";
      message: string;
    }
>;

const addMinutes = (value: Date, minutes: number) =>
  new Date(value.getTime() + minutes * 60_000);

const addHours = (value: Date, hours: number) =>
  new Date(value.getTime() + hours * 3_600_000);

const appendHistory = (
  history: ReadonlyArray<VisitorSessionStatusHistoryEntry>,
  entry: VisitorSessionStatusHistoryEntry,
) => {
  const next: ReadonlyArray<VisitorSessionStatusHistoryEntry> = [
    ...history,
    entry,
  ];
  return next;
};

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

const buildVisitorSessionError = (
  type: VisitorSessionError["type"],
  message: string,
): VisitorSessionError => {
  const error: VisitorSessionError = {
    type,
    message,
  };
  return error;
};

export const createVisitorSession = (input: {
  id: string;
  anonymousUid: string;
  now: Date;
  ttlHours?: number;
}): VisitorSession => {
  if (!input.id || !input.anonymousUid) {
    throw buildVisitorSessionError(
      "invalid-argument",
      "id and anonymousUid are required",
    );
  }
  const ttlHours = input.ttlHours ?? 48;
  const createdAt = input.now;
  const expiresAt = addHours(createdAt, ttlHours);
  const baseHistory: ReadonlyArray<VisitorSessionStatusHistoryEntry> = [
    { status: "capturing", occurredAt: createdAt },
  ];
  const session: VisitorSession = {
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
  };
  return session;
};

export const captureOriginalImage = (
  session: VisitorSession,
  input: { storagePath: string; capturedAt: Date; retentionMinutes?: number },
): VisitorSession => {
  if (session.status !== "capturing") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Original image can only be captured during capturing status",
    );
  }
  if (!input.storagePath) {
    throw buildVisitorSessionError(
      "invalid-argument",
      "storagePath must be provided",
    );
  }
  const retentionMinutes = input.retentionMinutes ?? 5;
  const capturedSession = withStatus(session, "selecting-theme", input.capturedAt);
  const updatedSession: VisitorSession = {
    ...capturedSession,
    originalImageRef: input.storagePath,
    originalImageRetentionDeadline: addMinutes(
      input.capturedAt,
      retentionMinutes,
    ),
  };
  return updatedSession;
};

export const selectTheme = (
  session: VisitorSession,
  input: { themeId: string; selectedAt: Date },
): VisitorSession => {
  if (session.status !== "selecting-theme") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Theme selection is only allowed in selecting-theme status",
    );
  }
  if (!input.themeId) {
    throw buildVisitorSessionError(
      "invalid-argument",
      "themeId must be provided",
    );
  }
  const updatedSession: VisitorSession = {
    ...session,
    themeId: input.themeId,
    updatedAt: input.selectedAt,
    statusHistory: appendHistory(session.statusHistory, {
      status: session.status,
      occurredAt: input.selectedAt,
    }),
  };
  return updatedSession;
};

export const startGeneration = (
  session: VisitorSession,
  input: { requestedAt: Date },
): VisitorSession => {
  if (session.status !== "selecting-theme") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Generation can only start after theme selection",
    );
  }
  if (!session.themeId || !session.originalImageRef) {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Generation requires both a theme and captured original image reference",
    );
  }
  return withStatus(session, "generating", input.requestedAt);
};

export const completeGeneration = (
  session: VisitorSession,
  input: {
    generatedImageRef: string;
    completedAt: Date;
    publicTokenId: string | null;
    aquariumEventId: string | null;
  },
): VisitorSession => {
  if (session.status !== "generating") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Generation can only be completed from generating status",
    );
  }
  if (!input.generatedImageRef) {
    throw buildVisitorSessionError(
      "invalid-argument",
      "generatedImageRef must be provided",
    );
  }
  const next = withStatus(session, "completed", input.completedAt);
  const updatedSession: VisitorSession = {
    ...next,
    generatedImageRef: input.generatedImageRef,
    publicTokenId: input.publicTokenId,
    aquariumEventId: input.aquariumEventId,
    failureReason: null,
  };
  return updatedSession;
};

export const failGeneration = (
  session: VisitorSession,
  input: { failedAt: Date; reason: string | null },
): VisitorSession => {
  if (session.status !== "generating") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Failure can only be recorded while generating",
    );
  }
  const next = withStatus(session, "failed", input.failedAt);
  const updatedSession: VisitorSession = {
    ...next,
    failureReason: input.reason,
  };
  return updatedSession;
};

export const expireSession = (
  session: VisitorSession,
  input: { expiredAt: Date },
): VisitorSession => {
  if (session.status === "completed" || session.status === "failed") {
    throw buildVisitorSessionError(
      "invalid-transition",
      "Completed or failed sessions cannot expire",
    );
  }
  if (input.expiredAt.getTime() < session.expiresAt.getTime()) {
    throw buildVisitorSessionError(
      "invalid-argument",
      "expiredAt must be on or after expiresAt",
    );
  }
  return withStatus(session, "expired", input.expiredAt);
};

export const needsOriginalImageDeletion = (
  session: VisitorSession,
  now: Date,
) =>
  session.originalImageRef !== null &&
  session.originalImageRetentionDeadline !== null &&
  now.getTime() >= session.originalImageRetentionDeadline.getTime();
