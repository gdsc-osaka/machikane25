import { describe, expect, test } from "vitest";
import {
  createGeneratedImageAsset,
  GeneratedImageAsset,
  updateAquariumSyncStatus,
} from "@/domain/generatedImageAsset";

const buildAssetInput = () => ({
  id: "asset-1",
  sessionId: "session-1",
  storagePath: "photos/session-1/original.png",
  previewUrl: "https://example.com/preview.png",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  expiresAt: new Date("2025-01-02T00:00:00.000Z"),
});

describe("createGeneratedImageAsset", () => {
  test("returns asset for valid input", () => {
    const asset = createGeneratedImageAsset(buildAssetInput());
    const expected: GeneratedImageAsset = {
      ...buildAssetInput(),
      aquariumSyncStatus: "pending",
      lastError: null,
      attempts: 0,
      lastAttemptAt: null,
    };
    expect(asset).toEqual(expected);
  });

  test("throws typed error when previewUrl is invalid", () => {
    try {
      createGeneratedImageAsset({
        ...buildAssetInput(),
        previewUrl: "invalid-url",
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "previewUrl must be a valid URL",
      });
    }
  });

  test("throws typed error when expiresAt is before createdAt", () => {
    try {
      createGeneratedImageAsset({
        ...buildAssetInput(),
        expiresAt: new Date("2024-12-31T23:00:00.000Z"),
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "expiresAt must be after createdAt",
      });
    }
  });
});

describe("updateAquariumSyncStatus", () => {
  const existing = createGeneratedImageAsset(buildAssetInput());

  test("updates sync fields", () => {
    const updated = updateAquariumSyncStatus(existing, {
      status: "retrying",
      lastError: "network timeout",
      updatedAt: new Date("2025-01-01T01:00:00.000Z"),
      attempts: 2,
    });
    expect(updated).toEqual({
      ...existing,
      aquariumSyncStatus: "retrying",
      lastError: "network timeout",
      attempts: 2,
      lastAttemptAt: new Date("2025-01-01T01:00:00.000Z"),
    });
  });

  test("throws typed error when attempts is negative", () => {
    try {
      updateAquariumSyncStatus(existing, {
        status: "pending",
        lastError: null,
        updatedAt: new Date("2025-01-01T01:00:00.000Z"),
        attempts: -1,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "attempts must be non-negative",
      });
    }
  });

  test("throws typed error when failed status lacks lastError", () => {
    try {
      updateAquariumSyncStatus(existing, {
        status: "failed",
        lastError: null,
        updatedAt: new Date("2025-01-01T01:00:00.000Z"),
        attempts: 1,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toEqual({
        type: "invalid-argument",
        message: "failed status requires lastError",
      });
    }
  });
});
