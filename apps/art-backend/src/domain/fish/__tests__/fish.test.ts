import { describe, expect, test } from "vitest";
import type { CreateFishInput, Fish } from "../fish";
import { createFish, fishSchema, isExpired } from "../fish";

const buildValidInput = (): CreateFishInput => ({
	id: "fish-123",
	imageUrl: "https://storage.googleapis.com/fish_images/fish-123/fish.png",
	imagePath: "fish_images/fish-123/fish.png",
	color: "#00FF88",
	createdAt: new Date("2024-03-01T10:00:00.000Z"),
});

const unwrapFish = (fishResult: ReturnType<typeof createFish>): Fish =>
	fishResult._unsafeUnwrap();

describe("createFish", () => {
	test("returns ok result for a valid fish", () => {
		const input = buildValidInput();
		const result = createFish(input);

		expect(result.isOk()).toBe(true);
		const fish = unwrapFish(result);
		expect(fish).toStrictEqual({
			id: input.id,
			imageUrl: input.imageUrl,
			imagePath: input.imagePath,
			color: input.color,
			createdAt: input.createdAt,
		});
		expect(fishSchema.safeParse(input).success).toBe(true);
	});

	test("returns validation error when color is not a hex string", () => {
		const input = {
			...buildValidInput(),
			color: "00FF88",
		};

		const result = createFish(input);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("validation");
		expect(error.message).toContain("color");
	});
});

describe("isExpired", () => {
	test("returns false while within TTL window", () => {
		const fish = unwrapFish(createFish(buildValidInput()));
		const now = new Date(fish.createdAt.getTime() + 29 * 60 * 1000);

		expect(isExpired({ fish, now, ttlMinutes: 30 })).toBe(false);
	});

	test("returns true when fish creation exceeds TTL", () => {
		const fish = unwrapFish(createFish(buildValidInput()));
		const now = new Date(fish.createdAt.getTime() + 31 * 60 * 1000);

		expect(isExpired({ fish, now, ttlMinutes: 30 })).toBe(true);
	});
});
