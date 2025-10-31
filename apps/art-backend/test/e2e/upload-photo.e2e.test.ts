// @vitest-environment node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import type { FishDTO } from "../../src/application/ports.js";
import { buildConfig } from "../../src/config/env.js";

const config = buildConfig();
const BASE_URL = "http://localhost:3000";

// Load real sample images
const SAMPLE_JPEG_PATH = join(__dirname, "../../sample.jpeg");
const SAMPLE_PNG_PATH = join(__dirname, "../../sample.png");
const sampleJpeg = readFileSync(SAMPLE_JPEG_PATH);
const samplePng = readFileSync(SAMPLE_PNG_PATH);

const createMultipartFormData = (
	parts: ReadonlyArray<
		Readonly<{
			name: string;
			filename?: string;
			contentType?: string;
			data: Uint8Array | string;
		}>
	>,
) => {
	const boundary = `----E2ETestBoundary${Date.now()}`;
	const buffers: Buffer[] = [];

	for (const part of parts) {
		buffers.push(Buffer.from(`--${boundary}\r\n`));
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
	buffers.push(Buffer.from(`--${boundary}--\r\n`));

	return {
		body: Buffer.concat(buffers),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
};

describe("POST /upload-photo E2E", () => {
	beforeAll(() => {
		console.log("⚠️  E2E tests require the server to be running: pnpm run dev");
		console.log(`   Testing against: ${BASE_URL}`);
		console.log(`   Using API key: ${config.apiKey.substring(0, 10)}...`);
	});

	afterEach(async () => {
		// Give server time to process
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	test("should successfully upload a photo and return fish data", async () => {
		const formData = createMultipartFormData([
			{
				name: "photo",
				filename: "test-photo.jpg",
				contentType: "image/jpeg",
				data: sampleJpeg,
			},
		]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"X-API-KEY": config.apiKey,
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		if (response.status !== 200) {
			const errorBody = await response.text();
			console.error(`Server error (${response.status}):`, errorBody);
		}

		expect(response.status).toBe(200);
		const body = (await response.json()) as FishDTO;

		expect(body).toHaveProperty("id");
		expect(body).toHaveProperty("imageUrl");
		expect(body).toHaveProperty("color");
		expect(typeof body.id).toBe("string");
		expect(body.id.length).toBeGreaterThan(0);
		expect(typeof body.imageUrl).toBe("string");
		expect(body.imageUrl).toMatch(/^https?:\/\//);
		expect(typeof body.color).toBe("string");
		expect(body.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	test("should return 401 when API key is missing", async () => {
		const formData = createMultipartFormData([
			{
				name: "photo",
				filename: "test-photo.jpg",
				contentType: "image/jpeg",
				data: sampleJpeg,
			},
		]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("AUTH_INVALID");
	});

	test("should return 401 when API key is invalid", async () => {
		const formData = createMultipartFormData([
			{
				name: "photo",
				filename: "test-photo.jpg",
				contentType: "image/jpeg",
				data: sampleJpeg,
			},
		]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"X-API-KEY": "invalid-api-key-12345",
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("AUTH_INVALID");
	});

	test("should return 400 when photo field is missing", async () => {
		const formData = createMultipartFormData([]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"X-API-KEY": config.apiKey,
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("REQUEST_INVALID");
	});

	test("should return 400 when photo field is not a file", async () => {
		const formData = createMultipartFormData([
			{
				name: "photo",
				data: "just-a-string-not-a-file",
			},
		]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"X-API-KEY": config.apiKey,
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("REQUEST_INVALID");
	});

	test("should accept PNG images", async () => {
		const formData = createMultipartFormData([
			{
				name: "photo",
				filename: "test-photo.png",
				contentType: "image/png",
				data: samplePng,
			},
		]);

		const response = await fetch(`${BASE_URL}/upload-photo`, {
			method: "POST",
			headers: {
				"X-API-KEY": config.apiKey,
				"Content-Type": formData.contentType,
			},
			body: formData.body,
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as FishDTO;
		expect(body).toHaveProperty("id");
		expect(body).toHaveProperty("imageUrl");
		expect(body).toHaveProperty("color");
		expect(body.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});
});
