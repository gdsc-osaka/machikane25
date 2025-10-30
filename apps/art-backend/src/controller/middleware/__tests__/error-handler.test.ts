import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";

import type { Logger } from "../../../application/ports.js";
import { RequestValidationError } from "../../../errors/request-validation-error.js";
import { UseCaseError } from "../../../errors/use-case-error.js";
import type { ControllerEnv } from "../../types.js";
import { createErrorHandler } from "../error-handler.js";

const createLogger = (): Logger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

describe("createErrorHandler", () => {
	test("converts unknown errors into UseCaseError and responds with 500", async () => {
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.get("/", () => {
			throw new Error("boom");
		});

		const response = await app.request("/");

		expect(response.status).toBe(500);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("INTERNAL_UNEXPECTED");
		expect(logger.error).toHaveBeenCalledWith(
			"boom",
			expect.objectContaining({ severity: "error" }),
		);
	});

	test("uses metadata from AppError and preserves status code", async () => {
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();
		const appError = new UseCaseError({
			message: "unexpected data",
			code: "UPLOAD_HANDLER_UNEXPECTED",
		});

		app.onError(createErrorHandler({ logger }));
		app.get("/", () => {
			throw appError;
		});

		const response = await app.request("/");

		expect(response.status).toBeGreaterThanOrEqual(500);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.message).toBe("unexpected data");
		expect(body.error).toBe("UPLOAD_HANDLER_UNEXPECTED");
		expect(logger.error).toHaveBeenCalledWith(
			"unexpected data",
			expect.objectContaining({ code: "UPLOAD_HANDLER_UNEXPECTED" }),
		);
	});

	test("logs warnings for validation errors", async () => {
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();
		const validationError = new RequestValidationError({
			message: "invalid",
			code: "REQUEST_INVALID",
			details: { field: "photo" },
		});

		app.onError(createErrorHandler({ logger }));
		app.get("/", () => {
			throw validationError;
		});

		const response = await app.request("/");

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("REQUEST_INVALID");
		expect(logger.warn).toHaveBeenCalledWith(
			"invalid",
			expect.objectContaining({ code: "REQUEST_INVALID" }),
		);
	});
});
