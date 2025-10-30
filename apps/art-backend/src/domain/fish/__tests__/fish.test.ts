import { describe, expect, test } from "vitest";

import { createFish, FishValidationError, isExpired } from "../fish.js";

const validInput = {
	id: "fish-123",
	imageUrl: "https://storage/fish.png",
	imagePath: "fish_images/fish-123/fish.png",
	color: "#FFAA11",
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
} as const;

describe("createFish", () => {
	test("returns immutable fish when input is valid", () => {
		const fish = createFish(validInput);

		expect(fish).toEqual(validInput);
		expect(Object.isFrozen(fish)).toBe(true);
	});

	test("throws FishValidationError when color is invalid", () => {
		expect(() =>
			createFish({
				...validInput,
				color: "123456",
			}),
		).toThrowError(FishValidationError);
	});

	test("throws FishValidationError when createdAt is invalid date", () => {
		expect(() =>
			createFish({
				...validInput,
				createdAt: new Date("invalid date"),
			}),
		).toThrowError(FishValidationError);
	});
});

describe("isExpired", () => {
	test("returns false when fish age is below TTL threshold", () => {
		const fish = createFish(validInput);
		const result = isExpired({
			fish,
			now: new Date("2024-01-01T00:10:00.000Z"),
			ttlMinutes: 15,
		});

		expect(result).toBe(false);
	});

	test("returns true when fish age equals TTL threshold", () => {
		const fish = createFish(validInput);
		const result = isExpired({
			fish,
			now: new Date("2024-01-01T00:15:00.000Z"),
			ttlMinutes: 15,
		});

		expect(result).toBe(true);
	});
});
