import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";

import type { Config } from "../../../config/env.js";
import { createLogger } from "../cloud-logger.js";

const config: Config = {
	apiKey: "key",
	firebaseProjectId: "project-id",
	credentialsPath: "/tmp/creds.json",
	fishTtlMinutes: 45,
	maxPhotoSizeMb: 10,
};

const spies = {
	log: vi.spyOn(console, "log"),
	warn: vi.spyOn(console, "warn"),
	error: vi.spyOn(console, "error"),
};

beforeEach(() => {
	spies.log.mockImplementation(() => undefined);
	spies.warn.mockImplementation(() => undefined);
	spies.error.mockImplementation(() => undefined);
});

afterEach(() => {
	spies.log.mockReset();
	spies.warn.mockReset();
	spies.error.mockReset();
});

afterAll(() => {
	spies.log.mockRestore();
	spies.warn.mockRestore();
	spies.error.mockRestore();
});

const parsePayload = (value: unknown) => {
	if (typeof value !== "string") {
		throw new Error("Expected payload to be a string");
	}

	return JSON.parse(value);
};

describe("createLogger", () => {
	test("logs info entries with severity and context", () => {
		const logger = createLogger({ config, requestId: "req-1" });

		logger.info("loaded fish", { count: 3 });

		expect(spies.log).toHaveBeenCalledTimes(1);
		const payload = spies.log.mock.calls.at(0)?.at(0);
		const entry = parsePayload(payload);

		expect(entry.severity).toBe("INFO");
		expect(entry.message).toBe("loaded fish");
		expect(entry.context).toMatchObject({
			count: 3,
			requestId: "req-1",
		});
		expect(entry.resource).toMatchObject({
			type: "cloud_run_revision",
			labels: {
				project_id: "project-id",
			},
		});
		expect(typeof entry.timestamp).toBe("string");
	});

	test("logs warnings with merged context", () => {
		const logger = createLogger({ config, requestId: "req-2" });

		logger.warn("slow upload", { latencyMs: 1200 });

		expect(spies.warn).toHaveBeenCalledTimes(1);
		const entry = parsePayload(spies.warn.mock.calls.at(0)?.at(0));

		expect(entry.severity).toBe("WARNING");
		expect(entry.context).toMatchObject({
			latencyMs: 1200,
			requestId: "req-2",
		});
	});

	test("logs errors without additional context", () => {
		const logger = createLogger({ config });

		logger.error("storage failure");

		expect(spies.error).toHaveBeenCalledTimes(1);
		const entry = parsePayload(spies.error.mock.calls.at(0)?.at(0));

		expect(entry.severity).toBe("ERROR");
		expect(entry.message).toBe("storage failure");
		expect(entry.context).toStrictEqual({});
	});
});
