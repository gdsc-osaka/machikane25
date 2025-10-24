import { describe, expect, test } from "vitest";
import {
  captureOriginalImage,
  completeGeneration,
  createVisitorSession,
  expireSession,
  failGeneration,
  needsOriginalImageDeletion,
  selectTheme,
  startGeneration,
  VisitorSession,
  VisitorSessionError,
} from "@/domain/visitorSession";

const now = new Date("2025-01-01T00:00:00.000Z");

const expectThrows = (action: () => void, expected: VisitorSessionError) => {
  try {
    action();
    throw new Error("expected failure");
  } catch (error) {
    expect(error).toEqual(expected);
  }
};

const buildSession = () =>
  createVisitorSession({
    id: "session-1",
    anonymousUid: "anon-1",
    now,
    ttlHours: 1,
  });

describe("createVisitorSession", () => {
  test("creates baseline session", () => {
    const session = buildSession();
    const expiresAt = new Date("2025-01-01T01:00:00.000Z");
    expect(session).toMatchObject({
      id: "session-1",
      anonymousUid: "anon-1",
      status: "capturing",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    expect(session.statusHistory).toEqual([
      { status: "capturing", occurredAt: now },
    ]);
  });

  test("throws typed error when identifiers missing", () => {
    expectThrows(
      () =>
        createVisitorSession({
          id: "",
          anonymousUid: "",
          now,
        }),
      {
        type: "invalid-argument",
        message: "id and anonymousUid are required",
      },
    );
  });
});

describe("captureOriginalImage", () => {
  test("stores original image and deadline", () => {
    const session = buildSession();
    const capturedAt = new Date("2025-01-01T00:05:00.000Z");
    const updated = captureOriginalImage(session, {
      storagePath: "photos/session-1/original.png",
      capturedAt,
      retentionMinutes: 10,
    });
    expect(updated.originalImageRef).toBe(
      "photos/session-1/original.png",
    );
    expect(updated.status).toBe("selecting-theme");
    expect(updated.originalImageRetentionDeadline).toEqual(
      new Date("2025-01-01T00:15:00.000Z"),
    );
  });

  test("throws when status is not capturing", () => {
    const session = buildSession();
    const selecting = captureOriginalImage(session, {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
    });
    expectThrows(
      () =>
        captureOriginalImage(selecting, {
          storagePath: "photos/session-1/original.png",
          capturedAt: now,
        }),
      {
        type: "invalid-transition",
        message:
          "Original image can only be captured during capturing status",
      },
    );
  });
});

describe("selectTheme and startGeneration", () => {
  const selectThemeForSession = () => {
    const session = captureOriginalImage(buildSession(), {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
    });
    return selectTheme(session, {
      themeId: "theme-1",
      selectedAt: new Date("2025-01-01T00:07:00.000Z"),
    });
  };

  test("selectTheme stores theme and retains status history", () => {
    const session = selectThemeForSession();
    expect(session.themeId).toBe("theme-1");
    expect(session.status).toBe("selecting-theme");
    expect(session.statusHistory.at(-1)).toEqual({
      status: "selecting-theme",
      occurredAt: new Date("2025-01-01T00:07:00.000Z"),
    });
  });

  test("startGeneration moves session to generating", () => {
    const session = selectThemeForSession();
    const generating = startGeneration(session, {
      requestedAt: new Date("2025-01-01T00:08:00.000Z"),
    });
    expect(generating.status).toBe("generating");
    expect(generating.statusHistory.at(-1)).toEqual({
      status: "generating",
      occurredAt: new Date("2025-01-01T00:08:00.000Z"),
    });
  });

  test("startGeneration requires theme and original image", () => {
    const session = captureOriginalImage(buildSession(), {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
    });
    const missingTheme: VisitorSession = {
      ...session,
      themeId: null,
    };
    expectThrows(
      () =>
        startGeneration(missingTheme, {
          requestedAt: new Date("2025-01-01T00:08:00.000Z"),
        }),
      {
        type: "invalid-transition",
        message:
          "Generation requires both a theme and captured original image reference",
      },
    );
  });
});

describe("completeGeneration and failGeneration", () => {
  const buildGeneratingSession = () => {
    const session = captureOriginalImage(buildSession(), {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
    });
    const themed = selectTheme(session, {
      themeId: "theme-1",
      selectedAt: now,
    });
    return startGeneration(themed, {
      requestedAt: new Date("2025-01-01T00:08:00.000Z"),
    });
  };

  test("completeGeneration stores generated assets", () => {
    const generating = buildGeneratingSession();
    const completed = completeGeneration(generating, {
      generatedImageRef: "generated/session-1.png",
      completedAt: new Date("2025-01-01T00:09:00.000Z"),
      publicTokenId: "token-1",
      aquariumEventId: "event-1",
    });
    expect(completed.status).toBe("completed");
    expect(completed.generatedImageRef).toBe("generated/session-1.png");
    expect(completed.failureReason).toBeNull();
  });

  test("fails when generated image reference missing", () => {
    const generating = buildGeneratingSession();
    expectThrows(
      () =>
        completeGeneration(generating, {
          generatedImageRef: "",
          completedAt: new Date("2025-01-01T00:09:00.000Z"),
          publicTokenId: "token-1",
          aquariumEventId: "event-1",
        }),
      {
        type: "invalid-argument",
        message: "generatedImageRef must be provided",
      },
    );
  });

  test("failGeneration records failure reason", () => {
    const generating = buildGeneratingSession();
    const failed = failGeneration(generating, {
      failedAt: new Date("2025-01-01T00:10:00.000Z"),
      reason: "timeout",
    });
    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toBe("timeout");
  });

  test("failGeneration enforces generating status", () => {
    const generating = buildGeneratingSession();
    const completed = completeGeneration(generating, {
      generatedImageRef: "generated/session-1.png",
      completedAt: new Date("2025-01-01T00:09:00.000Z"),
      publicTokenId: null,
      aquariumEventId: null,
    });
    expectThrows(
      () =>
        failGeneration(completed, {
          failedAt: new Date("2025-01-01T00:10:00.000Z"),
          reason: "timeout",
        }),
      {
        type: "invalid-transition",
        message: "Failure can only be recorded while generating",
      },
    );
  });
});

describe("expireSession", () => {
  const baseSession = buildSession();
  const selecting = captureOriginalImage(baseSession, {
    storagePath: "photos/session-1/original.png",
    capturedAt: now,
  });

  test("marks session as expired", () => {
    const expiredAt = new Date("2025-01-01T02:00:00.000Z");
    const expired = expireSession(selecting, { expiredAt });
    expect(expired.status).toBe("expired");
    expect(expired.statusHistory.at(-1)).toEqual({
      status: "expired",
      occurredAt: expiredAt,
    });
  });

  test("rejects completed sessions", () => {
    const generating = startGeneration(
      selectTheme(selecting, { themeId: "theme-1", selectedAt: now }),
      { requestedAt: now },
    );
    const completed = completeGeneration(generating, {
      generatedImageRef: "generated/session-1.png",
      completedAt: new Date("2025-01-01T01:00:00.000Z"),
      publicTokenId: null,
      aquariumEventId: null,
    });
    expectThrows(
      () =>
        expireSession(completed, {
          expiredAt: new Date("2025-01-01T02:00:00.000Z"),
        }),
      {
        type: "invalid-transition",
        message: "Completed or failed sessions cannot expire",
      },
    );
  });

  test("validates expiredAt timeline", () => {
    expectThrows(
      () =>
        expireSession(selecting, {
          expiredAt: new Date("2025-01-01T00:30:00.000Z"),
        }),
      {
        type: "invalid-argument",
        message: "expiredAt must be on or after expiresAt",
      },
    );
  });
});

describe("needsOriginalImageDeletion", () => {
  test("returns true when retention has passed", () => {
    const session = captureOriginalImage(buildSession(), {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
      retentionMinutes: 1,
    });
    const checkAt = new Date("2025-01-01T00:01:01.000Z");
    expect(needsOriginalImageDeletion(session, checkAt)).toBe(true);
  });

  test("returns false when retention has not passed", () => {
    const session = captureOriginalImage(buildSession(), {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
      retentionMinutes: 10,
    });
    const checkAt = new Date("2025-01-01T00:05:00.000Z");
    expect(needsOriginalImageDeletion(session, checkAt)).toBe(false);
  });
});
