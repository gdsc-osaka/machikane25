import { beforeEach, describe, expect, it, vi } from "vitest";
import { FieldValue } from "firebase-admin/firestore";

const setMock = vi.fn();
const getMock = vi.fn();
const docMock = vi.fn();
const collectionMock = vi.fn();
const collectionGroupMock = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({
		collection: collectionMock,
		collectionGroup: collectionGroupMock,
	}),
}));

describe("photoRepository", () => {
	beforeEach(() => {
		setMock.mockReset();
		getMock.mockReset();
		docMock.mockReset();
		collectionMock.mockReset();
		collectionGroupMock.mockReset();
	});

	it("creates uploaded photo under booth subcollection", async () => {
		const boothCollectionDocMock = vi.fn(() => ({
			collection: vi.fn((subcollection: string) => {
				expect(subcollection).toBe("uploadedPhotos");
				return {
					doc: vi.fn((photoId: string) => {
						expect(photoId).toBe("photo-123");
						return {
							set: setMock,
						};
					}),
				};
			}),
		}));

		collectionMock.mockImplementation((collectionName: string) => {
			if (collectionName === "booths") {
				return {
					doc: boothCollectionDocMock,
				};
			}
			throw new Error(`Unexpected collection: ${collectionName}`);
		});

		const { createUploadedPhoto } = await import(
			"@/infra/firebase/photoRepository"
		);

		await createUploadedPhoto({
			boothId: "booth-321",
			photoId: "photo-123",
			imagePath: "photos/photo-123/photo.png",
			imageUrl: "https://example.com/photo-123.png",
		});

		expect(setMock).toHaveBeenCalledWith({
			boothId: "booth-321",
			photoId: "photo-123",
			imagePath: "photos/photo-123/photo.png",
			imageUrl: "https://example.com/photo-123.png",
			createdAt: FieldValue.serverTimestamp(),
		});
	});

	it("creates generated photo under booth generatedPhotos subcollection", async () => {
		const boothCollectionDocMock = vi.fn(() => ({
			collection: vi.fn((subcollection: string) => {
				expect(subcollection).toBe("generatedPhotos");
				return {
					doc: vi.fn((photoId: string) => {
						expect(photoId).toBe("photo-999");
						return {
							set: setMock,
						};
					}),
				};
			}),
		}));

		collectionMock.mockImplementation((collectionName: string) => {
			if (collectionName === "booths") {
				return {
					doc: boothCollectionDocMock,
				};
			}
			throw new Error(`Unexpected collection: ${collectionName}`);
		});

		const { createGeneratedPhoto } = await import(
			"@/infra/firebase/photoRepository"
		);

		await createGeneratedPhoto({
			boothId: "booth-xyz",
			photoId: "photo-999",
			imagePath: "generated_photos/photo-999/photo.png",
			imageUrl: "https://example.com/generated/photo-999.png",
		});

		expect(setMock).toHaveBeenCalledWith({
			boothId: "booth-xyz",
			photoId: "photo-999",
			imagePath: "generated_photos/photo-999/photo.png",
			imageUrl: "https://example.com/generated/photo-999.png",
			createdAt: FieldValue.serverTimestamp(),
		});
	});

	it("queries uploaded photo by photoId using collection group", async () => {
		const whereMock = vi.fn(() => ({
			limit: vi.fn(() => ({
				get: getMock,
			})),
		}));

		collectionGroupMock.mockImplementation((groupName: string) => {
			expect(groupName).toBe("uploadedPhotos");
			return {
				where: whereMock,
			};
		});

	const { queryUploadedPhotosByPhotoId } = await import(
		"@/infra/firebase/photoRepository"
	);

	queryUploadedPhotosByPhotoId("photo-group");
	expect(collectionGroupMock).toHaveBeenCalledWith("uploadedPhotos");
	expect(whereMock).toHaveBeenCalledWith("photoId", "==", "photo-group");
});
});
