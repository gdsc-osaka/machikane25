import {
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { describe, expect, test, vi } from "vitest";
import * as converters from "@/infra/firestore/converters";
import {
  captureOriginalImage,
  completeGeneration,
  createVisitorSession,
  failGeneration,
  selectTheme,
  startGeneration,
} from "@/domain/visitorSession";
import {
  createGeneratedImageAsset,
  updateAquariumSyncStatus,
} from "@/domain/generatedImageAsset";
import {
  consumePublicAccessToken,
  createPublicAccessToken,
} from "@/domain/publicAccessToken";

const createSnapshot = <T extends DocumentData>(
  id: string,
  data: T,
): QueryDocumentSnapshot<DocumentData, DocumentData> =>
  ({
    id,
    data: () => data,
  } as unknown as QueryDocumentSnapshot<DocumentData, DocumentData>);

const createSnapshotWith = (
  id: string,
  dataFn: () => DocumentData,
): QueryDocumentSnapshot<DocumentData, DocumentData> =>
  ({
    id,
    data: dataFn,
  } as unknown as QueryDocumentSnapshot<DocumentData, DocumentData>);

describe("VisitorSession conversion", () => {
  const now = new Date("2025-01-01T00:00:00.000Z");
  const buildSession = () => {
    const session = createVisitorSession({
      id: "session-1",
      anonymousUid: "anon-1",
      now,
      ttlHours: 2,
    });
    const captured = captureOriginalImage(session, {
      storagePath: "photos/session-1/original.png",
      capturedAt: now,
    });
    const themed = selectTheme(captured, {
      themeId: "theme-1",
      selectedAt: new Date("2025-01-01T00:05:00.000Z"),
    });
    const generating = startGeneration(themed, {
      requestedAt: new Date("2025-01-01T00:10:00.000Z"),
    });
    return failGeneration(generating, {
      failedAt: new Date("2025-01-01T00:15:00.000Z"),
      reason: "network error",
    });
  };

  test("serializes and deserializes visitor sessions", async () => {
    const session = buildSession();
    const serialized = converters.serializeVisitorSession(session);
    const snapshot = createSnapshot(session.id, serialized);
    const converted =
      converters.visitorSessionConverter.fromFirestore(snapshot);
    expect(converted).toEqual(session);
  });

  test("deserializeVisitorSession throws typed error", () => {
    const invalid = {
      id: "session-1",
      data: {
        anonymousUid: "anon-1",
        status: "invalid",
        statusHistory: [],
      },
    };
    try {
      converters.deserializeVisitorSession({
        id: invalid.id,
        data: invalid.data,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-record",
        message: "Invalid visitor session status for status",
      });
    }
  });

  test("visitorSessionConverter wraps unexpected errors", async () => {
    const spy = vi
      .spyOn(converters, "deserializeVisitorSession")
      .mockImplementation(() => {
        throw new Error("unexpected");
      });

    const snapshot = createSnapshotWith("session-1", () => {
      throw new Error("unexpected");
    });

    expect(() =>
      converters.visitorSessionConverter.fromFirestore(snapshot),
    ).toThrowError("visitorSessionConverter: unexpected");

    spy.mockRestore();
  });
});

describe("GeneratedImageAsset conversion", () => {
  const now = new Date("2025-01-01T00:00:00.000Z");
  const future = new Date("2025-01-01T02:00:00.000Z");

  const buildAsset = () => {
    const asset = createGeneratedImageAsset({
      id: "asset-1",
      sessionId: "session-1",
      storagePath: "photos/session-1/generated.png",
      previewUrl: "https://example.com/generated.png",
      createdAt: now,
      expiresAt: future,
    });
    return updateAquariumSyncStatus(asset, {
      status: "retrying",
      lastError: "network timeout",
      updatedAt: new Date("2025-01-01T01:00:00.000Z"),
      attempts: 2,
    });
  };

  test("serializes and deserializes generated image asset", async () => {
    const asset = buildAsset();
    const serialized = converters.serializeGeneratedImageAsset(asset);
    const snapshot = createSnapshot(asset.id, serialized);
    const converted =
      converters.generatedImageAssetConverter.fromFirestore(snapshot);
    expect(converted).toEqual(asset);
  });

  test("deserializeGeneratedImageAsset validates attempts", () => {
    const data = {
      sessionId: "session-1",
      storagePath: "path",
      previewUrl: "https://example.com",
      aquariumSyncStatus: "pending",
      lastError: null,
      attempts: -1,
      lastAttemptAt: null,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(future),
    };
    expect.assertions(1);
    try {
      converters.deserializeGeneratedImageAsset({ id: "asset-1", data });
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-record",
        message: "attempts must be a non-negative number",
      });
    }
  });
});

describe("PublicAccessToken conversion", () => {
  const now = new Date("2025-01-01T00:00:00.000Z");
  const future = new Date("2025-01-01T01:00:00.000Z");

  const buildToken = () =>
    consumePublicAccessToken(
      createPublicAccessToken({
        id: "token-1",
        sessionId: "session-1",
        now,
        expiresAt: future,
      }),
      { now: future },
    );

  test("serializes and deserializes public access token", async () => {
    const token = buildToken();
    const serialized = converters.serializePublicAccessToken(token);
    const snapshot = createSnapshot(token.id, serialized);
    const converted =
      converters.publicAccessTokenConverter.fromFirestore(snapshot);
    expect(converted).toEqual(token);
  });

  test("deserializePublicAccessToken validates consumedAt presence", () => {
    const data = {
      sessionId: "session-1",
      isConsumed: true,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(future),
      consumedAt: null,
    };
    expect.assertions(1);
    try {
      converters.deserializePublicAccessToken({ id: "token-1", data });
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-record",
        message: "consumed tokens require consumedAt timestamp",
      });
    }
  });
});
