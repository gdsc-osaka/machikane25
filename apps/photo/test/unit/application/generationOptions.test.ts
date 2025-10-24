import { describe, expect, it } from "vitest";
import {
	loadGenerationOptions,
	selectOptionsByType,
	resetGenerationOptionsCache,
} from "@/application/generationOptions";
import { GenerationOptionType } from "@/infra/remoteConfig";

type RemoteConfigStub = {
	getValue: (key: string) => { asString: () => string };
	update: (values: Record<string, string>) => void;
	callLog: string[];
};

const createRemoteConfigStub = (
	initialValues: Record<string, string>,
): RemoteConfigStub => {
	let current = initialValues;
	const callLog: string[] = [];
	return {
		callLog,
		getValue: (key: string) => {
			callLog.push(key);
			return {
				asString: () => current[key] ?? "",
			};
		},
		update: (values: Record<string, string>) => {
			current = values;
		},
	};
};

const optionsPayload = JSON.stringify({
	version: 2,
	updatedAt: "2025-10-20T12:00:00.000Z",
	maintenanceMode: false,
	options: [
		{
			id: "fireworks",
			type: "location",
			displayName: { ja: "花火大会", en: "Fireworks Festival" },
			imagePath: "/images/fireworks.png",
			isActive: true,
		},
		{
			id: "yukata",
			type: "outfit",
			displayName: { ja: "浴衣", en: "Yukata" },
			imagePath: "/images/yukata.png",
			isActive: true,
		},
		{
			id: "archived",
			type: "location",
			displayName: { ja: "旧校舎", en: "Old Campus" },
			imagePath: null,
			isActive: false,
		},
	],
});

describe("Generation options loader", () => {
	it("parses active Remote Config payloads and groups options by type", () => {
		const remoteConfig = createRemoteConfigStub({
			PHOTO_GENERATION_OPTIONS: optionsPayload,
		});
		const state = loadGenerationOptions(remoteConfig, {
			now: new Date("2025-10-21T08:00:00.000Z"),
		});
		expect(state.maintenanceMode).toBe(false);
		expect(state.version).toBe(2);
		expect(state.updatedAt.toISOString()).toBe("2025-10-20T12:00:00.000Z");
		expect(state.options).toHaveLength(2);
		const locations = selectOptionsByType(
			state,
			GenerationOptionType.Location,
		);
		expect(locations).toHaveLength(1);
		expect(locations[0]?.id).toBe("fireworks");
		const outfits = selectOptionsByType(state, GenerationOptionType.Outfit);
		expect(outfits[0]?.displayName.ja).toBe("浴衣");
	});

	it("caches recent payloads and refreshes after TTL", () => {
		resetGenerationOptionsCache();
		const remoteConfig = createRemoteConfigStub({
			PHOTO_GENERATION_OPTIONS: optionsPayload,
		});
		const first = loadGenerationOptions(remoteConfig, {
			now: new Date("2025-10-21T08:00:00.000Z"),
		});
		remoteConfig.update({
			PHOTO_GENERATION_OPTIONS: JSON.stringify({
				version: 3,
				updatedAt: "2025-10-21T08:05:00.000Z",
				maintenanceMode: true,
				options: [],
			}),
		});
		const second = loadGenerationOptions(remoteConfig, {
			now: new Date("2025-10-21T08:00:15.000Z"),
		});
		expect(second.version).toBe(first.version);
		expect(remoteConfig.callLog).toHaveLength(1);

		const third = loadGenerationOptions(remoteConfig, {
			now: new Date("2025-10-21T08:05:01.000Z"),
		});
		expect(remoteConfig.callLog.length).toBeGreaterThan(1);
		expect(third.version).toBe(3);
		expect(third.maintenanceMode).toBe(true);
	});

	it("returns an error when Remote Config payload is malformed", () => {
		resetGenerationOptionsCache();
		const remoteConfig = createRemoteConfigStub({
			PHOTO_GENERATION_OPTIONS: "{broken json",
		});
		try {
			loadGenerationOptions(remoteConfig, {
				now: new Date("2025-10-21T08:00:00.000Z"),
			});
			throw new Error("expected loadGenerationOptions to throw");
		} catch (error) {
			expect((error as { type?: string }).type).toBe("invalid-payload");
		}
	});
});
