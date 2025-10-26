import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the logger modules before importing
vi.mock("@/packages/logger/be-logger", () => ({
	beLogger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/packages/logger/fe-logger", () => ({
	feLogger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Logger Index", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getLogger", () => {
		it("should return beLogger when window is undefined (server-side)", async () => {
			// Ensure window is undefined
			const originalWindow = global.window;
			// @ts-expect-error - Deleting window for testing
			delete global.window;

			// Dynamically import to get fresh module
			const { getLogger } = await import("@/packages/logger/index");
			const { beLogger } = await import("@/packages/logger/be-logger");

			const logger = getLogger();

			expect(logger).toBe(beLogger);

			// Restore window
			global.window = originalWindow;
		});

		it("should return feLogger when window is defined (client-side)", async () => {
			// Ensure window is defined
			if (typeof window === "undefined") {
				// In a Node environment, we need to mock window
				// @ts-expect-error - Setting window for testing
				global.window = {};
			}

			// Dynamically import to get fresh module
			const { getLogger } = await import("@/packages/logger/index");
			const { feLogger } = await import("@/packages/logger/fe-logger");

			const logger = getLogger();

			expect(logger).toBe(feLogger);
		});

		it("should return logger with correct methods", async () => {
			const { getLogger } = await import("@/packages/logger/index");
			const logger = getLogger();

			expect(logger).toHaveProperty("debug");
			expect(logger).toHaveProperty("info");
			expect(logger).toHaveProperty("warn");
			expect(logger).toHaveProperty("error");
			expect(typeof logger.debug).toBe("function");
			expect(typeof logger.info).toBe("function");
			expect(typeof logger.warn).toBe("function");
			expect(typeof logger.error).toBe("function");
		});
	});

	describe("default export", () => {
		it("should export getLogger function", async () => {
			const loggerModule = await import("@/packages/logger/index");

			expect(loggerModule.default).toBeDefined();
			expect(loggerModule.default.getLogger).toBeDefined();
			expect(typeof loggerModule.default.getLogger).toBe("function");
		});

		it("should have getLogger in default export that works correctly", async () => {
			const loggerModule = await import("@/packages/logger/index");

			const logger = loggerModule.default.getLogger();

			expect(logger).toHaveProperty("debug");
			expect(logger).toHaveProperty("info");
			expect(logger).toHaveProperty("warn");
			expect(logger).toHaveProperty("error");
		});
	});
});
