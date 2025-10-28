import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationOption } from "@/domain/generationOption";
import { fetchAllOptions } from "@/infra/firebase/generationOptionRepository";

// Mock Firebase Admin
const mockCollection = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: vi.fn(() => ({
		collection: mockCollection,
	})),
}));

describe("generationOptionRepository", () => {
	let mockDocs: Array<{
		id: string;
		data: () => Record<string, unknown>;
	}>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock Firestore documents
		mockDocs = [
			{
				id: "location-1",
				data: () => ({
					typeId: "location",
					value: "beach",
					displayName: "Beach",
					imageUrl: "https://example.com/beach.jpg",
					imagePath: "/images/beach.jpg",
					createdAt: { toDate: () => new Date("2025-01-01") },
					updatedAt: { toDate: () => new Date("2025-01-02") },
				}),
			},
			{
				id: "outfit-1",
				data: () => ({
					typeId: "outfit",
					value: "casual",
					displayName: "Casual",
					imageUrl: null,
					imagePath: null,
					createdAt: { toDate: () => new Date("2025-01-03") },
					updatedAt: { toDate: () => new Date("2025-01-04") },
				}),
			},
			{
				id: "style-1",
				data: () => ({
					typeId: "style",
					value: "vibrant",
					displayName: "Vibrant",
					// Missing imageUrl and imagePath to test null coalescing
					createdAt: { toDate: () => new Date("2025-01-05") },
					updatedAt: { toDate: () => new Date("2025-01-06") },
				}),
			},
		];

		// Mock Firestore methods
		mockGet.mockResolvedValue({ docs: mockDocs });
		mockCollection.mockReturnValue({ get: mockGet });
	});

	describe("fetchAllOptions", () => {
		it("should fetch all options from Firestore", async () => {
			const result = await fetchAllOptions();

			expect(mockCollection).toHaveBeenCalledWith("options");
			expect(mockGet).toHaveBeenCalledOnce();
			expect(result).toHaveLength(3);
		});

		it("should map Firestore documents to GenerationOption entities", async () => {
			const result = await fetchAllOptions();

			const expected: GenerationOption[] = [
				{
					id: "location-1",
					typeId: "location",
					value: "beach",
					displayName: "Beach",
					imageUrl: "https://example.com/beach.jpg",
					imagePath: "/images/beach.jpg",
					createdAt: new Date("2025-01-01"),
					updatedAt: new Date("2025-01-02"),
				},
				{
					id: "outfit-1",
					typeId: "outfit",
					value: "casual",
					displayName: "Casual",
					imageUrl: null,
					imagePath: null,
					createdAt: new Date("2025-01-03"),
					updatedAt: new Date("2025-01-04"),
				},
				{
					id: "style-1",
					typeId: "style",
					value: "vibrant",
					displayName: "Vibrant",
					imageUrl: null,
					imagePath: null,
					createdAt: new Date("2025-01-05"),
					updatedAt: new Date("2025-01-06"),
				},
			];

			expect(result).toEqual(expected);
		});

		it("should handle null values for imageUrl and imagePath", async () => {
			const result = await fetchAllOptions();

			const optionWithNull = result.find((opt) => opt.id === "outfit-1");
			expect(optionWithNull?.imageUrl).toBeNull();
			expect(optionWithNull?.imagePath).toBeNull();
		});

		it("should handle missing imageUrl and imagePath fields", async () => {
			const result = await fetchAllOptions();

			const optionWithMissing = result.find((opt) => opt.id === "style-1");
			expect(optionWithMissing?.imageUrl).toBeNull();
			expect(optionWithMissing?.imagePath).toBeNull();
		});

		it("should return empty array when no documents exist", async () => {
			mockGet.mockResolvedValue({ docs: [] });

			const result = await fetchAllOptions();

			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
		});

		it("should convert Firestore timestamps to JavaScript Date objects", async () => {
			const result = await fetchAllOptions();

			const firstOption = result[0];
			expect(firstOption?.createdAt).toBeInstanceOf(Date);
			expect(firstOption?.updatedAt).toBeInstanceOf(Date);
			expect(firstOption?.createdAt.toISOString()).toBe(
				new Date("2025-01-01").toISOString(),
			);
			expect(firstOption?.updatedAt.toISOString()).toBe(
				new Date("2025-01-02").toISOString(),
			);
		});
	});
});
