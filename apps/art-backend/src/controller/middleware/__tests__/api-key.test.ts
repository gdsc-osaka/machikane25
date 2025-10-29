import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import type { Logger } from "../../../application/ports.js";
import type { Config } from "../../../config/env.js";
import { AppError } from "../../../errors/app-error.js";
import type { ControllerEnv } from "../../types.js";
import { createApiKeyMiddleware } from "../api-key.js";
import { createErrorHandler } from "../error-handler.js";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
	apiKey: "super-secret",
	firebaseProjectId: "proj",
	credentialsPath: "/tmp/creds.json",
	fishTtlMinutes: 30,
	maxPhotoSizeMb: 5,
	...overrides,
});

const createLogger = (): Logger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

describe("createApiKeyMiddleware", () => {
	test("allows requests with valid API key and sets correlation ID", async () => {
		const config = createConfig();
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/", (c) => {
			return c.json({
				correlationId: c.get("correlationId"),
			});
		});

		const response = await app.request("/", {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as { correlationId: string };
		expect(typeof body.correlationId).toBe("string");
		expect(body.correlationId.length).toBeGreaterThan(0);
		expect(logger.info).toHaveBeenCalledWith(
			"auth.success",
			expect.objectContaining({ correlationId: body.correlationId }),
		);
	});

	test("rejects requests with missing API key and logs warning", async () => {
		const config = createConfig();
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/", (c) => c.text("ok"));

		const response = await app.request("/");

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toContain("AUTH");
		expect(logger.warn).toHaveBeenCalledWith(
			"auth.failed",
			expect.objectContaining({ reason: "missing" }),
		);
	});

	test("rejects requests with invalid API key", async () => {
		const config = createConfig();
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/", (c) => c.text("ok"));

		const response = await app.request("/", {
			headers: {
				"X-API-KEY": "wrong",
			},
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toContain("AUTH");
		expect(logger.warn).toHaveBeenCalledWith(
			"auth.failed",
			expect.objectContaining({ reason: "mismatch" }),
		);
	});

	test("bubbles AppError instances from downstream handlers", async () => {
		const config = createConfig();
		const logger = createLogger();
		const app = new Hono<ControllerEnv>();
		const appError = new AppError({
			message: "downstream failure",
			code: "DOWNSTREAM_ERROR",
		});

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/", () => {
			throw appError;
		});

		const response = await app.request("/", {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(500);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("DOWNSTREAM_ERROR");
	});
});
