import { describe, expect, test, vi } from "vitest";
import {
  loadGenerationOptions,
  resetGenerationOptionsCache,
  selectOptionsByType,
} from "@/application/generationOptions";
import { GenerationOptionType } from "@/infra/remoteConfig";

const now = new Date("2025-01-01T00:00:00.000Z");

const buildPayload = (overrides?: { isActiveSecond?: boolean }) =>
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
        type: GenerationOptionType.Location,
        displayName: { ja: "場所B", en: "Location B" },
        imagePath: null,
        isActive: overrides?.isActiveSecond ?? false,
      },
    ],
  });

const buildRemoteConfig = (payload: string) => ({
  getValue: vi.fn(() => ({
    asString: () => payload,
  })),
});

describe("loadGenerationOptions", () => {
  test("loads options and caches result", () => {
    resetGenerationOptionsCache();
    const remoteConfig = buildRemoteConfig(buildPayload());
    const state = loadGenerationOptions(remoteConfig, { now });
    expect(state).toMatchObject({
      version: 1,
      maintenanceMode: false,
    });
    expect(state.options).toHaveLength(1);

    // Second call served from cache
    const second = loadGenerationOptions(remoteConfig, { now });
    expect(remoteConfig.getValue).toHaveBeenCalledTimes(1);
    expect(second).toBe(state);
  });

  test("clears cache and surfaces RemoteConfigError on failure", () => {
    resetGenerationOptionsCache();
    const failingConfig = buildRemoteConfig("not-json");
    expect(() => loadGenerationOptions(failingConfig, { now })).toThrowError(
      /invalid-payload/i,
    );
    expect(failingConfig.getValue).toHaveBeenCalledTimes(1);

    const recoveryConfig = buildRemoteConfig(
      buildPayload({ isActiveSecond: true }),
    );
    const recovered = loadGenerationOptions(recoveryConfig, { now });
    expect(recovered.options).toHaveLength(2);
  });
});

describe("selectOptionsByType", () => {
  test("filters options by requested type", () => {
    resetGenerationOptionsCache();
    const remoteConfig = buildRemoteConfig(buildPayload());
    const state = loadGenerationOptions(remoteConfig, { now });
    const filtered = selectOptionsByType(state, GenerationOptionType.Location);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("opt-1");
  });
});

test("resetGenerationOptionsCache clears stored states", () => {
  const remoteConfig = buildRemoteConfig(buildPayload());
  const initial = loadGenerationOptions(remoteConfig, { now });
  expect(initial.options).toHaveLength(1);

  resetGenerationOptionsCache();

  const fresh = loadGenerationOptions(remoteConfig, {
    now: new Date("2025-01-01T00:05:00.000Z"),
  });
  expect(remoteConfig.getValue).toHaveBeenCalledTimes(2);
  expect(fresh).not.toBe(initial);
});
