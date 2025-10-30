// @vitest-environment node

import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import type { FishDTO } from "../../../application/ports.js";
import type { Config } from "../../../config/env.js";
import { UseCaseError } from "../../../errors/use-case-error.js";
import { createApiKeyMiddleware } from "../../middleware/api-key.js";
import { createErrorHandler } from "../../middleware/error-handler.js";
import type { ControllerEnv } from "../../types.js";
import { createUploadPhotoHandler } from "../upload-photo.handler.js";

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

const createMultipartRequest = (
	path: string,
	params: Readonly<{
		boundary: string;
		headers?: Record<string, string>;
		parts: ReadonlyArray<
			Readonly<{
				name: string;
				filename?: string;
				contentType?: string;
				data: Uint8Array | string;
			}>
		>;
	}>,
) => {
	const buffers: Buffer[] = [];
	for (const part of params.parts) {
		buffers.push(Buffer.from(`--${params.boundary}\r\n`));
		const disposition = `Content-Disposition: form-data; name="${part.name}"${
			part.filename ? `; filename="${part.filename}"` : ""
		}\r\n`;
		buffers.push(Buffer.from(disposition));
		if (part.contentType) {
			buffers.push(Buffer.from(`Content-Type: ${part.contentType}\r\n\r\n`));
		} else {
			buffers.push(Buffer.from("\r\n"));
		}
		const payload =
			typeof part.data === "string"
				? Buffer.from(part.data)
				: Buffer.from(part.data);
		buffers.push(payload);
		buffers.push(Buffer.from("\r\n"));
	}
	buffers.push(Buffer.from(`--${params.boundary}--\r\n`));

	const body = Buffer.concat(buffers);

	const requestInit: RequestInit = {
		method: "POST",
		headers: {
			"Content-Type": `multipart/form-data; boundary=${params.boundary}`,
			...(params.headers ?? {}),
		},
		body,
	};

	return new Request(`http://localhost${path}`, requestInit);
};

describe("createUploadPhotoHandler", () => {
	test("accepts multipart photo and invokes use case", async () => {
		const config = createConfig();
		const logger = createLogger();
		const fish: FishDTO = {
			id: "fish-1",
			imageUrl: "https://bucket/fish.png",
			color: "#abcdef",
		};
		const addFishFromPhoto = vi.fn().mockResolvedValue(fish);
		const handler = createUploadPhotoHandler({
			addFishFromPhoto,
			logger,
			config,
		});
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.post("/upload-photo", handler);

		const photoBuffer = Buffer.from("fake-image");
		const response = await app.fetch(
			createMultipartRequest("/upload-photo", {
				boundary: "----vitest-upload",
				headers: {
					"X-API-KEY": config.apiKey,
				},
				parts: [
					{
						name: "photo",
						filename: "photo.png",
						contentType: "image/png",
						data: photoBuffer,
					},
				],
			}),
		);

		const body = (await response.json()) as
			| { error?: string; message?: string }
			| FishDTO;
		if ("error" in (body as Record<string, unknown>)) {
			throw new Error(`unexpected error response: ${JSON.stringify(body)}`);
		}
		expect(response.status).toBe(200);
		expect(body).toStrictEqual(fish);

		const call = addFishFromPhoto.mock.calls.at(0);
		expect(call).toBeDefined();
		const args = call?.at(0);
		if (args === undefined) {
			throw new Error("expected addFishFromPhoto to be called");
		}
		expect(args.photo.mimeType).toBe("image/png");
		expect(args.photo.size).toBe(photoBuffer.byteLength);
		expect(args.photo.buffer.equals(photoBuffer)).toBe(true);
		expect(typeof args.correlationId).toBe("string");
		expect(args.correlationId.length).toBeGreaterThan(0);
	});

	test("returns 400 when photo field is missing", async () => {
		const config = createConfig();
		const logger = createLogger();
		const addFishFromPhoto = vi.fn();
		const handler = createUploadPhotoHandler({
			addFishFromPhoto,
			logger,
			config,
		});
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.post("/upload-photo", handler);

		const response = await app.fetch(
			createMultipartRequest("/upload-photo", {
				boundary: "----vitest-empty",
				headers: {
					"X-API-KEY": config.apiKey,
				},
				parts: [],
			}),
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("REQUEST_INVALID");
		expect(addFishFromPhoto).not.toHaveBeenCalled();
	});

	test("propagates AppError from use case", async () => {
		const config = createConfig();
		const logger = createLogger();
		const addFishFromPhoto = vi.fn().mockRejectedValue(
			new UseCaseError({
				message: "use case failed",
				code: "ADD_FISH_UNEXPECTED",
			}),
		);
		const handler = createUploadPhotoHandler({
			addFishFromPhoto,
			logger,
			config,
		});
		const app = new Hono<ControllerEnv>();

		app.onError(createErrorHandler({ logger }));
		app.use("*", createApiKeyMiddleware({ config, logger }));
		app.post("/upload-photo", handler);

		const response = await app.fetch(
			createMultipartRequest("/upload-photo", {
				boundary: "----vitest-error",
				headers: {
					"X-API-KEY": config.apiKey,
				},
				parts: [
					{
						name: "photo",
						filename: "photo.jpg",
						contentType: "image/jpeg",
						data: Buffer.from("photo"),
					},
				],
			}),
		);

		const body = (await response.json()) as { error: string; message: string };
		expect(response.status).toBe(500);
		expect(body.error).toBe("ADD_FISH_UNEXPECTED");
	});
});
