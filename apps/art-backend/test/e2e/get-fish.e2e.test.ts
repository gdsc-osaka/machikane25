// @vitest-environment node

import { afterEach, beforeAll, describe, expect, test } from "vitest";
import type { FishDTO } from "../../src/application/ports.js";
import { buildConfig } from "../../src/config/env.js";

const config = buildConfig();
const BASE_URL = "http://localhost:3000";

describe("GET /get-fish E2E", () => {
	beforeAll(() => {
		console.log("⚠️  E2E tests require the server to be running: pnpm run dev");
		console.log(`   Testing against: ${BASE_URL}`);
		console.log(`   Using API key: ${config.apiKey.substring(0, 10)}...`);
	});

	afterEach(async () => {
		// Give server time to process
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	test("should return array of fish (may be empty or populated depending on db state)", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`, {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");

		const body = (await response.json()) as readonly FishDTO[];
		expect(Array.isArray(body)).toBe(true);

		// Validate structure of each fish if any exist
		for (const fish of body) {
			expect(fish).toHaveProperty("id");
			expect(fish).toHaveProperty("imageUrl");
			expect(fish).toHaveProperty("color");
			expect(typeof fish.id).toBe("string");
			expect(fish.id.length).toBeGreaterThan(0);
			expect(typeof fish.imageUrl).toBe("string");
			expect(fish.imageUrl).toMatch(/^https?:\/\//);
			expect(typeof fish.color).toBe("string");
			expect(fish.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});

	test("should return 401 when API key is missing", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`);

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("AUTH_INVALID");
	});

	test("should return 401 when API key is invalid", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`, {
			headers: {
				"X-API-KEY": "invalid-api-key-12345",
			},
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string; message: string };
		expect(body.error).toBe("AUTH_INVALID");
	});

	test("should always set Cache-Control header to no-store", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`, {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});

	test("should validate response is valid JSON array", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`, {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("application/json");

		const body = (await response.json()) as readonly FishDTO[];
		expect(Array.isArray(body)).toBe(true);
	});

	test("should validate fish data structure matches OpenAPI schema", async () => {
		const response = await fetch(`${BASE_URL}/get-fish`, {
			headers: {
				"X-API-KEY": config.apiKey,
			},
		});

		expect(response.status).toBe(200);
		const body = (await response.json()) as readonly FishDTO[];

		// Each fish should match the schema
		for (const fish of body) {
			// Required fields per OpenAPI spec
			expect(fish).toHaveProperty("id");
			expect(fish).toHaveProperty("imageUrl");
			expect(fish).toHaveProperty("color");

			// Type validation
			expect(typeof fish.id).toBe("string");
			expect(typeof fish.imageUrl).toBe("string");
			expect(typeof fish.color).toBe("string");

			// Format validation
			expect(fish.color).toMatch(/^#[0-9A-Fa-f]{6}$/);

			// No extra properties
			const keys = Object.keys(fish);
			expect(keys).toHaveLength(3);
			expect(keys.sort()).toStrictEqual(["color", "id", "imageUrl"].sort());
		}
	});

	test("should handle multiple concurrent requests", async () => {
		const requests = Array.from({ length: 5 }, () =>
			fetch(`${BASE_URL}/get-fish`, {
				headers: {
					"X-API-KEY": config.apiKey,
				},
			}),
		);

		const responses = await Promise.all(requests);

		for (const response of responses) {
			expect(response.status).toBe(200);
			const body = (await response.json()) as readonly FishDTO[];
			expect(Array.isArray(body)).toBe(true);
		}
	});
});
