import { beforeEach, describe, expect, it, vi } from "vitest";
import { beLogger } from "@/packages/logger/be-logger";

describe("beLogger", () => {
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
	let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
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
	});

	describe("debug", () => {
		it("should call console.debug with provided arguments", () => {
			beLogger.debug("debug message", { key: "value" });
			expect(consoleDebugSpy).toHaveBeenCalledWith("debug message", {
				key: "value",
			});
		});

		it("should handle multiple arguments", () => {
			beLogger.debug("arg1", "arg2", 123, { nested: true });
			expect(consoleDebugSpy).toHaveBeenCalledWith("arg1", "arg2", 123, {
				nested: true,
			});
		});
	});

	describe("info", () => {
		it("should call console.info with provided arguments", () => {
			beLogger.info("info message", { data: 123 });
			expect(consoleInfoSpy).toHaveBeenCalledWith("info message", { data: 123 });
		});

		it("should handle single argument", () => {
			beLogger.info("single info message");
			expect(consoleInfoSpy).toHaveBeenCalledWith("single info message");
		});
	});

	describe("warn", () => {
		it("should call console.warn with provided arguments", () => {
			beLogger.warn("warning message", 456);
			expect(consoleWarnSpy).toHaveBeenCalledWith("warning message", 456);
		});

		it("should handle no arguments", () => {
			beLogger.warn();
			expect(consoleWarnSpy).toHaveBeenCalledWith();
		});
	});

	describe("error", () => {
		it("should call console.error with provided arguments", () => {
			const error = new Error("test error");
			beLogger.error(error);
			expect(consoleErrorSpy).toHaveBeenCalledWith(error);
		});

		it("should handle string error messages", () => {
			beLogger.error("error message");
			expect(consoleErrorSpy).toHaveBeenCalledWith("error message");
		});

		it("should handle multiple arguments", () => {
			beLogger.error("error:", { code: 500 }, "details");
			expect(consoleErrorSpy).toHaveBeenCalledWith("error:", { code: 500 }, "details");
		});
	});
});
