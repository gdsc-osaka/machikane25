import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";

import { buildConfig, type Config } from "../env.js";

const baseEnv = {
	API_KEY: "test-key",
	FIREBASE_PROJECT_ID: "test-project",
	GOOGLE_APPLICATION_CREDENTIALS: "/tmp/credentials.json",
	FISH_TTL_MINUTES: "30",
	MAX_PHOTO_SIZE_MB: "5",
} satisfies Record<string, string>;

const originalEnv = { ...process.env };

const applyEnv = (overrides: Record<string, string | undefined>) => {
	const merged = {
		...originalEnv,
		...baseEnv,
		...overrides,
	};

	Object.keys(process.env).forEach((key) => {
		if (!(key in merged)) {
			Reflect.deleteProperty(process.env, key);
		}
	});

	Object.entries(merged).forEach(([key, value]) => {
		if (value === undefined) {
			Reflect.deleteProperty(process.env, key);
			return;
		}

		process.env[key] = value;
	});
};

const restoreOriginalEnv = () => {
	Object.keys(process.env).forEach((key) => {
		if (!(key in originalEnv)) {
			Reflect.deleteProperty(process.env, key);
		}
	});

	Object.entries(originalEnv).forEach(([key, value]) => {
		if (value === undefined) {
			Reflect.deleteProperty(process.env, key);
			return;
		}

		process.env[key] = value;
	});
};

describe("buildConfig", () => {
	beforeEach(() => {
		applyEnv({});
	});

	afterEach(() => {
		restoreOriginalEnv();
	});

	afterAll(() => {
		restoreOriginalEnv();
	});

	test("returns frozen config with parsed values", () => {
		const config = buildConfig();

		const expected: Config = {
			apiKey: "test-key",
			firebaseProjectId: "test-project",
			credentialsPath: "/tmp/credentials.json",
			fishTtlMinutes: 30,
			maxPhotoSizeMb: 5,
		};

		expect(config).toStrictEqual(expected);
		expect(Object.isFrozen(config)).toBe(true);
	});

	test("throws when required environment variable is missing", () => {
		const envWithoutKey = {
			...baseEnv,
			API_KEY: undefined,
		};

		applyEnv(envWithoutKey);

		expect(() => buildConfig()).toThrowError("API_KEY");
	});

	test("throws when numeric environment variable is invalid", () => {
		const invalidEnv = {
			...baseEnv,
			FISH_TTL_MINUTES: "not-a-number",
		};

		applyEnv(invalidEnv);

		expect(() => buildConfig()).toThrowError("FISH_TTL_MINUTES");
	});
});
