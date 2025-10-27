import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feLogger } from "@/packages/logger/fe-logger";

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
	captureException: vi.fn(),
}));

describe("feLogger", () => {
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
	let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleDebugSpy.mockRestore();
		consoleInfoSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		Object.defineProperty(process.env, "NODE_ENV", {
			value: originalEnv,
			writable: true,
			configurable: true,
			enumerable: true,
		});
	});

	describe("debug", () => {
		it("should call console.debug with provided arguments", () => {
			feLogger.debug("debug message", { key: "value" });
			expect(consoleDebugSpy).toHaveBeenCalledWith("debug message", {
				key: "value",
			});
		});

		it("should not send to Sentry", () => {
			feLogger.debug("debug message");
			expect(Sentry.captureMessage).not.toHaveBeenCalled();
		});
	});

	describe("info", () => {
		it("should call console.info with provided arguments", () => {
			feLogger.info("info message", { data: 123 });
			expect(consoleInfoSpy).toHaveBeenCalledWith("info message", { data: 123 });
		});

		it("should send to Sentry in production", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info("info message", { data: 123 });
			expect(Sentry.captureMessage).toHaveBeenCalledWith(
				'info message {"data":123}',
				"info",
			);
		});

		it("should not send to Sentry in development", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true, configurable: true, enumerable: true });
			feLogger.info("info message");
			expect(Sentry.captureMessage).not.toHaveBeenCalled();
		});
	});

	describe("warn", () => {
		it("should call console.warn with provided arguments", () => {
			feLogger.warn("warning message", 456);
			expect(consoleWarnSpy).toHaveBeenCalledWith("warning message", 456);
		});

		it("should send to Sentry in production", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.warn("warning message", 456);
			expect(Sentry.captureMessage).toHaveBeenCalledWith(
				"warning message 456",
				"warning",
			);
		});

		it("should not send to Sentry in development", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true, configurable: true, enumerable: true });
			feLogger.warn("warning message");
			expect(Sentry.captureMessage).not.toHaveBeenCalled();
		});
	});

	describe("error", () => {
		it("should call console.error with provided arguments", () => {
			const error = new Error("test error");
			feLogger.error(error);
			expect(consoleErrorSpy).toHaveBeenCalledWith(error);
		});

		it("should send Error instance to Sentry in production", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			const error = new Error("test error");
			feLogger.error(error);
			expect(Sentry.captureException).toHaveBeenCalledWith(error);
		});

		it("should create Error from string and send to Sentry in production", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.error("error message");
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "error message",
				}),
			);
		});

		it("should handle multiple arguments", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.error("error:", { code: 500 }, "details");
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'error: {"code":500} details',
				}),
			);
		});

		it("should not send to Sentry in development", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true, configurable: true, enumerable: true });
			feLogger.error("error message");
			expect(Sentry.captureException).not.toHaveBeenCalled();
		});
	});

	describe("safeStringify behavior", () => {
		it("should handle circular references", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			const circular: Record<string, unknown> = { name: "test" };
			circular.self = circular;

			feLogger.info(circular);
			// Should not throw and should call Sentry with stringified version
			expect(Sentry.captureMessage).toHaveBeenCalled();
		});

		it("should handle undefined values", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info(undefined);
			expect(Sentry.captureMessage).toHaveBeenCalledWith("undefined", "info");
		});

		it("should handle null values", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info(null);
			expect(Sentry.captureMessage).toHaveBeenCalledWith("null", "info");
		});

		it("should handle string values", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info("plain string");
			expect(Sentry.captureMessage).toHaveBeenCalledWith("plain string", "info");
		});

		it("should handle number values", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info(42);
			expect(Sentry.captureMessage).toHaveBeenCalledWith("42", "info");
		});

		it("should handle boolean values", () => {
			Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
			feLogger.info(true);
			expect(Sentry.captureMessage).toHaveBeenCalledWith("true", "info");
		});
	});
});
