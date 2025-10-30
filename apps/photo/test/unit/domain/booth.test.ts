import { describe, expect, it } from "vitest";
import type { BoothState } from "@/domain/booth";
import { boothSchema, ensureValidBoothState } from "@/domain/booth";

describe("booth domain", () => {
	it("accepts every valid booth state", () => {
		const validStates = ["idle", "menu", "capturing", "generating", "completed"] satisfies ReadonlyArray<BoothState>;

		validStates.forEach((state) => {
			expect(() => ensureValidBoothState(state)).not.toThrow();
		});
	});

	it("ignores undefined booth state", () => {
		expect(() => ensureValidBoothState(undefined)).not.toThrow();
	});

	it("rejects an invalid booth state value", () => {
		// @ts-expect-error runtime validation should reject values outside BoothState union
		expect(() => ensureValidBoothState("paused")).toThrowError();
	});

	it("parses a valid booth snapshot", () => {
		const booth = boothSchema.parse({
			id: "booth-001",
			state: "menu",
			latestPhotoId: "photo-123",
			lastTakePhotoAt: new Date("2025-01-02T03:04:05Z"),
			createdAt: new Date("2025-01-01T00:00:00Z"),
			updatedAt: new Date("2025-01-02T00:00:00Z"),
		});

		expect(booth.state).toBe("menu");
		expect(booth.latestPhotoId).toBe("photo-123");
	});

	it("rejects booth snapshot with invalid timestamps", () => {
		expect(() =>
			boothSchema.parse({
				id: "booth-002",
				state: "idle",
				latestPhotoId: null,
				lastTakePhotoAt: null,
				createdAt: "2025-01-01T00:00:00Z",
				updatedAt: new Date("2025-01-01T00:00:00Z"),
			}),
		).toThrowError();
	});
});
