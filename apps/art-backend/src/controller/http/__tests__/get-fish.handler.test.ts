import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import type { FishDTO } from "../../../application/ports.js";
import type { Config } from "../../../config/env.js";
import { UseCaseError } from "../../../errors/use-case-error.js";
import { createApiKeyMiddleware } from "../../middleware/api-key.js";
import { createErrorHandler } from "../../middleware/error-handler.js";
import type { ControllerEnv } from "../../types.js";
import { createGetFishHandler } from "../get-fish.handler.js";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
	apiKey: "test-key",
	firebaseProjectId: "proj",
	credentialsPath: "/tmp/creds.json",
	fishTtlMinutes: 45,
	maxPhotoSizeMb: 5,
	...overrides,
});

const createLogger = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

describe("createGetFishHandler", () => {
	test("returns fish array and sets cache control header", async () => {
		const config = createConfig();
		const logger = createLogger();
		const fish: readonly FishDTO[] = [
			{
				id: "fish-1",
				imageUrl: "https://fish/url.png",
				color: "#123456",
			},
		];
		const listFish = vi.fn().mockResolvedValue(fish);
		const handler = createGetFishHandler({
			listFish,
			logger,
		});
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/get-fish", handler);

		const response = await app.request("/get-fish", {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const body = (await response.json()) as readonly FishDTO[];
		expect(body).toStrictEqual(fish);

		const call = listFish.mock.calls.at(0);
		expect(call).toBeDefined();
		const args = call?.at(0);
		if (args === undefined) {
			throw new Error("expected listFish to be called");
		}
		expect(args.correlationId.length).toBeGreaterThan(0);
	});

	test("bubbles AppError from use case", async () => {
		const config = createConfig();
		const logger = createLogger();
		const listFish = vi.fn().mockRejectedValue(
			new UseCaseError({
				message: "listing failed",
				code: "LIST_FISH_UNEXPECTED",
			}),
		);
		const handler = createGetFishHandler({
			listFish,
			logger,
		});
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.get("/get-fish", handler);

		const response = await app.request("/get-fish", {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(500);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("LIST_FISH_UNEXPECTED");
	});
});
