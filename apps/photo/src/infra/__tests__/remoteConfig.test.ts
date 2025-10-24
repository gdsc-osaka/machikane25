import { describe, expect, test, vi } from "vitest";
import {
  GenerationOptionType,
  parseGenerationOptionsPayload,
  readGenerationOptionsConfig,
  REMOTE_CONFIG_KEYS,
  RemoteConfigError,
} from "@/infra/remoteConfig";

const now = new Date("2025-01-01T00:00:00.000Z");

const buildPayload = () =>
  JSON.stringify({
    version: 1,
    updatedAt: now.toISOString(),
    maintenanceMode: false,
    options: [
      {
        id: "opt-1",
        type: GenerationOptionType.Location,
        displayName: { ja: "場所A", en: "Location A" },
        imagePath: null,
        isActive: true,
      },
      {
        id: "opt-2",
        type: GenerationOptionType.Outfit,
        displayName: { ja: "衣装B", en: "Outfit B" },
        imagePath: "/images/outfit-b.png",
        isActive: false,
      },
    ],
  });

const expectRemoteConfigError = (
  action: () => void,
  expected: Partial<RemoteConfigError>,
) => {
  try {
    action();
    throw new Error("expected failure");
  } catch (error) {
    expect(error).toMatchObject(expected);
  }
};

describe("parseGenerationOptionsPayload", () => {
  test("parses payload and converts dates", () => {
    const config = parseGenerationOptionsPayload(buildPayload());
    expect(config.version).toBe(1);
    expect(config.updatedAt).toEqual(now);
    expect(config.options).toHaveLength(2);
    expect(config.options[0]).toMatchObject({
      id: "opt-1",
      type: "location",
      isActive: true,
    });
  });

  test("throws when payload is empty", () => {
    expectRemoteConfigError(
      () => parseGenerationOptionsPayload(""),
      {
        type: "missing-key",
        message: "PHOTO_GENERATION_OPTIONS is empty",
      },
    );
  });

  test("throws when payload JSON is invalid", () => {
    try {
      parseGenerationOptionsPayload("not-json");
      throw new Error("expected failure");
    } catch (error) {
      const remoteError = error as RemoteConfigError;
      expect(remoteError).toMatchObject({
        type: "invalid-payload",
        message: "Failed to parse payload",
      });
      if ("details" in remoteError && typeof remoteError.details === "string") {
        expect(remoteError.details).toMatch(/Unexpected token/);
      } else {
        throw new Error("remoteError.details must be provided for invalid payloads");
      }
    }
  });

  test("throws when option type is invalid", () => {
    const invalidPayload = JSON.stringify({
      version: 1,
      updatedAt: now.toISOString(),
      options: [
        {
          id: "opt-1",
          type: "invalid",
          displayName: { ja: "場所A", en: "Location A" },
          imagePath: null,
          isActive: true,
        },
      ],
    });
    expectRemoteConfigError(
      () => parseGenerationOptionsPayload(invalidPayload),
      {
        type: "invalid-payload",
        message: "Option opt-1 has invalid type",
      },
    );
  });
});

describe("readGenerationOptionsConfig", () => {
  test("reads value from remote config", () => {
    const getValue = vi.fn(() => ({
      asString: () => buildPayload(),
    }));
    const config = readGenerationOptionsConfig({ getValue });
    expect(getValue).toHaveBeenCalledWith(
      REMOTE_CONFIG_KEYS.generationOptions,
    );
    expect(config.options).toHaveLength(2);
  });
});
