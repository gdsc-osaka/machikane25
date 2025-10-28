import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const baseEnv = {
	API_KEY: "test-api-key",
	FIREBASE_PROJECT_ID: "test-project",
	GOOGLE_APPLICATION_CREDENTIALS: "/tmp/service-account.json",
	FISH_TTL_MINUTES: "90",
	MAX_PHOTO_SIZE_MB: "8",
};

type EnvShape = typeof baseEnv;

const assignedKeys = new Set<string>();

const assignEnv = (values: Partial<EnvShape>) => {
	Object.entries(values).forEach(([key, value]) => {
		if (typeof value === "string") {
			assignedKeys.add(key);
			process.env[key] = value;
		}
	});
};

const clearAssignedEnv = () => {
	assignedKeys.forEach((key) => {
		delete process.env[key];
	});
	assignedKeys.clear();
};

describe("buildConfig", () => {
	beforeEach(() => {
		vi.resetModules();
		clearAssignedEnv();
	});

	afterEach(() => {
		clearAssignedEnv();
	});

	test("returns frozen configuration when all variables are valid", async () => {
		assignEnv(baseEnv);
		const { buildConfig } = await import("../env.js");

		const config = buildConfig();

		expect(config.apiKey).toBe(baseEnv.API_KEY);
		expect(config.firebaseProjectId).toBe(baseEnv.FIREBASE_PROJECT_ID);
		expect(config.credentialsPath).toBe(baseEnv.GOOGLE_APPLICATION_CREDENTIALS);
		expect(config.fishTtlMinutes).toBe(90);
		expect(config.maxPhotoSizeMb).toBe(8);
		expect(Object.isFrozen(config)).toBe(true);
	});

	test("throws ConfigError when a required variable is missing", async () => {
		assignEnv({
			FIREBASE_PROJECT_ID: baseEnv.FIREBASE_PROJECT_ID,
			GOOGLE_APPLICATION_CREDENTIALS: baseEnv.GOOGLE_APPLICATION_CREDENTIALS,
			FISH_TTL_MINUTES: baseEnv.FISH_TTL_MINUTES,
			MAX_PHOTO_SIZE_MB: baseEnv.MAX_PHOTO_SIZE_MB,
		});

		const { buildConfig, ConfigError } = await import("../env.js");

		let caught: unknown = null;
		try {
			buildConfig();
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ConfigError);
		if (caught instanceof ConfigError) {
			expect(caught.context.missingKeys).toEqual(["API_KEY"]);
		}
	});

	test("throws ConfigError when numeric variables are invalid", async () => {
		assignEnv({
			...baseEnv,
			FISH_TTL_MINUTES: "-5",
		});

		const { buildConfig, ConfigError } = await import("../env.js");

		let caught: unknown = null;
		try {
			buildConfig();
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ConfigError);
		if (caught instanceof ConfigError) {
			expect(caught.context.invalidKeys).toEqual(["FISH_TTL_MINUTES"]);
		}
	});

	test("derives ConfigError from AppError base type", async () => {
		assignEnv({
			FIREBASE_PROJECT_ID: baseEnv.FIREBASE_PROJECT_ID,
			GOOGLE_APPLICATION_CREDENTIALS: baseEnv.GOOGLE_APPLICATION_CREDENTIALS,
			FISH_TTL_MINUTES: baseEnv.FISH_TTL_MINUTES,
			MAX_PHOTO_SIZE_MB: baseEnv.MAX_PHOTO_SIZE_MB,
		});

		const { buildConfig, ConfigError } = await import("../env.js");
		const { AppError } = await import("../../errors/app-error.js");

		let caught: unknown = null;
		try {
			buildConfig();
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ConfigError);
		expect(caught).toBeInstanceOf(AppError);
	});
});
