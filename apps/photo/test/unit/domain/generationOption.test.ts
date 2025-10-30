import { describe, expect, expectTypeOf, it } from "vitest";
import type {
	GenerationOption,
	GenerationOptionTypeId,
	GroupedGenerationOptions,
} from "@/domain/generationOption";

describe("generation option domain", () => {
	it("enumerates the supported generation option type ids", () => {
		const typeIds: readonly GenerationOptionTypeId[] = [
			"location",
			"outfit",
			"person",
			"style",
			"pose",
		];

		expect(typeIds).toHaveLength(5);
		expect(new Set(typeIds).size).toBe(typeIds.length);
	});

	it("models a generation option entity", () => {
		const option: GenerationOption = {
			id: "location/shibuya-scramble",
			typeId: "location",
			value: "shibuya_scramble",
			displayName: "Shibuya Scramble",
			imageUrl: "https://cdn.example.com/generation/location/shibuya.png",
			imagePath: "generation/location/shibuya.png",
			createdAt: new Date("2025-01-01T00:00:00Z"),
			updatedAt: new Date("2025-01-02T00:00:00Z"),
		};

		expect(option.displayName).toBe("Shibuya Scramble");
		expectTypeOf(option).toMatchTypeOf<GenerationOption>();
	});

	it("groups generation options by type id", () => {
		const locationOption: GenerationOption = {
			id: "location/aquarium",
			typeId: "location",
			value: "aquarium",
			displayName: "Aquarium",
			imageUrl: null,
			imagePath: null,
			createdAt: new Date("2025-02-01T00:00:00Z"),
			updatedAt: new Date("2025-02-01T00:10:00Z"),
		};

		const grouped: GroupedGenerationOptions = {
			[locationOption.typeId]: [locationOption],
		};

		expect(grouped.location[0].value).toBe("aquarium");
		expectTypeOf(grouped.location).toMatchTypeOf<GenerationOption[]>();
	});
});
