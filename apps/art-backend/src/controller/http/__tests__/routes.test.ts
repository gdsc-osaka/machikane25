import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import type { Logger } from "../../../application/ports.js";
import type { Config } from "../../../config/env.js";
import type { ControllerEnv } from "../../types.js";
import { registerRoutes } from "../routes.js";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
	apiKey: "route-key",
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

describe("registerRoutes", () => {
	test("wires middleware and handlers", async () => {
		const config = createConfig();
		const logger = createLogger();
		const uploadHandler = vi.fn(async (c) => {
			return c.json({ route: "upload" });
		});
		const getFishHandler = vi.fn(async (c) => {
			return c.json({ route: "get" });
		});

		const app = new Hono<ControllerEnv>();
		registerRoutes(app, {
			config,
			logger,
			handlers: {
				uploadPhoto: uploadHandler,
				getFish: getFishHandler,
			},
		});

		const unauthorized = await app.request("/upload-photo", {
			method: "POST",
		});
		expect(unauthorized.status).toBe(401);

		const uploadResponse = await app.request("/upload-photo", {
			method: "POST",
			headers: {
				"X-API-KEY": config.apiKey,
			},
			body: new FormData(),
		});
		expect(uploadResponse.status).toBe(200);
		expect(uploadHandler).toHaveBeenCalledTimes(1);

		const getResponse = await app.request("/get-fish", {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});
		expect(getResponse.status).toBe(200);
		expect(getFishHandler).toHaveBeenCalledTimes(1);
	});
});
