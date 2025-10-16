import { describe, expect, it } from "vitest";
import { swrKeys } from "../keys";

describe("swrKeys", () => {
	it("creates the maintenance cache key", () => {
		expect(swrKeys.maintenance()).toEqual(["stamp", "maintenance"]);
	});

	it("creates the progress cache key with explicit uid", () => {
		expect(swrKeys.progress("abc")).toEqual(["stamp", "progress", "abc"]);
	});

	it("falls back to anonymous progress cache key when uid missing", () => {
		expect(swrKeys.progress(null)).toEqual(["stamp", "progress", "anonymous"]);
		expect(swrKeys.progress()).toEqual(["stamp", "progress", "anonymous"]);
	});

	it("creates the stamp award cache key", () => {
		expect(swrKeys.stampAward("token-123")).toEqual([
			"stamp",
			"award",
			"token-123",
		]);
	});

	it("creates the survey status cache key", () => {
		expect(swrKeys.surveyStatus("user-42")).toEqual([
			"stamp",
			"survey",
			"user-42",
		]);
	});

	it("falls back to anonymous survey key when uid missing", () => {
		expect(swrKeys.surveyStatus(undefined)).toEqual([
			"stamp",
			"survey",
			"anonymous",
		]);
	});

	it("creates the reward preview cache key", () => {
		expect(swrKeys.rewardPreview("reward-user")).toEqual([
			"stamp",
			"reward",
			"reward-user",
		]);
	});

	it("creates the admin redemption cache key", () => {
		expect(swrKeys.adminRedemption("payload-hash")).toEqual([
			"stamp",
			"redeem",
			"payload-hash",
		]);
	});
});
