import { GEMINI_PRO_IMAGE_MODEL_ID } from "@/domain/models";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findGeneratedPhotoMock = vi.fn();

vi.mock("@/infra/firebase/photoRepository", () => ({
	findGeneratedPhoto: findGeneratedPhotoMock,
	findGeneratedPhotos: vi.fn().mockResolvedValue([]),
}));

const getMock = vi.fn().mockResolvedValue({
	exists: false,
	data: () => ({}),
});
const docMock = vi.fn().mockReturnValue({
	get: getMock,
});
const collectionMock = vi.fn().mockReturnValue({
	doc: docMock,
});
const firestoreMock = {
	collection: collectionMock,
};

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: vi.fn().mockReturnValue(firestoreMock),
}));

describe("GenerationService.getGeneratedPhoto", () => {
	beforeEach(() => {
		findGeneratedPhotoMock.mockReset();
	});

	it("returns generated photo when present and within 24 hours", async () => {
		const now = Date.now();
		findGeneratedPhotoMock.mockResolvedValue({
			boothId: "booth-1",
			photoId: "photo-1",
			imagePath: "generated_photos/photo-1/photo.png",
			imageUrl: "https://example.com/generated/photo-1.png",
			createdAt: new Date(now - 60 * 60 * 1000),
			modelId: GEMINI_PRO_IMAGE_MODEL_ID,
		});

		const { getGeneratedPhoto } = await import(
			"@/application/generationService"
		);

		const result = await getGeneratedPhoto("booth-1", "photo-1");
		expect(result).toEqual({
			id: "photo-1",
			imageUrl: "https://example.com/generated/photo-1.png",
			modelId: GEMINI_PRO_IMAGE_MODEL_ID,
			relatedPhotos: [],
		});
		expect(findGeneratedPhotoMock).toHaveBeenCalledWith("booth-1", "photo-1");
	}, 30000);

	it("throws PhotoNotFoundError when repository returns null", async () => {
		findGeneratedPhotoMock.mockResolvedValue(null);

		const { getGeneratedPhoto, isPhotoNotFoundError } = await import(
			"@/application/generationService"
		);

		let capturedError: unknown;
		await expect(
			getGeneratedPhoto("booth-unknown", "photo-unknown").catch((error) => {
				capturedError = error;
				throw error;
			}),
		).rejects.toMatchObject({ name: "PhotoNotFoundError" });

		expect(isPhotoNotFoundError(capturedError)).toBe(true);
	}, 30000);

	it("throws PhotoExpiredError when photo is older than 24 hours", async () => {
		const now = Date.now();
		findGeneratedPhotoMock.mockResolvedValue({
			boothId: "booth-1",
			photoId: "photo-expired",
			imagePath: "generated_photos/photo-expired/photo.png",
			imageUrl: "https://example.com/generated/photo-expired.png",
			createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
		});

		const { getGeneratedPhoto, isPhotoExpiredError } = await import(
			"@/application/generationService"
		);

		let capturedError: unknown;
		await expect(
			getGeneratedPhoto("booth-1", "photo-expired").catch((error) => {
				capturedError = error;
				throw error;
			}),
		).rejects.toMatchObject({ name: "PhotoExpiredError" });

		expect(isPhotoExpiredError(capturedError)).toBe(true);
	}, 30000);
});
