import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Config } from "../../../config/env.js";

const config: Config = {
	apiKey: "api",
	firebaseProjectId: "project",
	credentialsPath: "/credentials.json",
	fishTtlMinutes: 60,
	maxPhotoSizeMb: 10,
};

const setupConsoleSpies = () => ({
	log: vi.spyOn(console, "log").mockImplementation(() => undefined),
	warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
	error: vi.spyOn(console, "error").mockImplementation(() => undefined),
});

describe("createLogger", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("emits structured info logs with severity and context", async () => {
		const spies = setupConsoleSpies();
		const { createLogger } = await import("../cloud-logger.js");

		const logger = createLogger({ config, requestId: "req-42" });
		logger.info("fish-emitted", { fishId: "abc" });

		expect(spies.log).toHaveBeenCalledTimes(1);
		const [firstCall] = spies.log.mock.calls;
		expect(firstCall).toBeDefined();
		if (firstCall !== undefined) {
			const [firstArg] = firstCall;
			expect(typeof firstArg).toBe("string");
			if (typeof firstArg === "string") {
				const parsed = JSON.parse(firstArg);
				expect(parsed.severity).toBe("INFO");
				expect(parsed.message).toBe("fish-emitted");
				expect(parsed.context).toMatchObject({
					fishId: "abc",
					requestId: "req-42",
					projectId: config.firebaseProjectId,
				});
			}
		}
	});

	test("emits warn and error logs with appropriate severity", async () => {
		const spies = setupConsoleSpies();
		const { createLogger } = await import("../cloud-logger.js");

		const logger = createLogger({ config });
		logger.warn("fish-stale");
		logger.error("fish-failed", { cause: "timeout" });

		expect(spies.warn).toHaveBeenCalledTimes(1);
		expect(spies.error).toHaveBeenCalledTimes(1);
		const [warnCall] = spies.warn.mock.calls;
		const [errorCall] = spies.error.mock.calls;
		if (warnCall !== undefined) {
			const [warnArg] = warnCall;
			if (typeof warnArg === "string") {
				const parsedWarn = JSON.parse(warnArg);
				expect(parsedWarn.severity).toBe("WARNING");
				expect(parsedWarn.message).toBe("fish-stale");
			}
		}
		if (errorCall !== undefined) {
			const [errorArg] = errorCall;
			if (typeof errorArg === "string") {
				const parsedError = JSON.parse(errorArg);
				expect(parsedError.severity).toBe("ERROR");
				expect(parsedError.context).toMatchObject({ cause: "timeout" });
			}
		}
	});

	test("falls back gracefully when context cannot be stringified", async () => {
		const spies = setupConsoleSpies();
		const { createLogger } = await import("../cloud-logger.js");

		const logger = createLogger({ config });
		const circular: { self?: unknown } = {};
		circular.self = circular;

		expect(() => logger.info("circular-context", circular)).not.toThrow();
		expect(spies.log).toHaveBeenCalled();
	});
});
