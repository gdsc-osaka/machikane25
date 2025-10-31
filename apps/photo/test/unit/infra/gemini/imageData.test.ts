import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	queryUploadedPhotosByPhotoIdMock,
	getAdminFirestoreMock,
	getAdminStorageMock,
} = vi.hoisted(() => ({
	queryUploadedPhotosByPhotoIdMock: vi.fn(),
	getAdminFirestoreMock: vi.fn(),
	getAdminStorageMock: vi.fn(),
}));

vi.mock("@/infra/firebase/photoRepository", () => ({
	queryUploadedPhotosByPhotoId: queryUploadedPhotosByPhotoIdMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: getAdminFirestoreMock,
	getAdminStorage: getAdminStorageMock,
}));

import { getImageDataFromId } from "@/infra/gemini/imageData";

describe("infra/gemini/imageData", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		queryUploadedPhotosByPhotoIdMock.mockReset();
		getAdminFirestoreMock.mockReset();
		getAdminStorageMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		Reflect.deleteProperty(global, "fetch");
	});

	it("returns image data from storage when uploaded photo includes imagePath", async () => {
		const fileMock = {
			download: vi.fn(async () => [Buffer.from("binary")]),
			getMetadata: vi.fn(async () => [
				{
					contentType: "image/png",
				},
			]),
		};
		const bucketMock = {
			file: vi.fn(() => fileMock),
			name: "photo-bucket",
		};
		const storageMock = {
			bucket: vi.fn(() => bucketMock),
		};
		getAdminStorageMock.mockReturnValue(storageMock);
		queryUploadedPhotosByPhotoIdMock.mockReturnValue({
			get: async () => ({
				docs: [
					{
						data: () => ({
							imagePath: "uploads/photo.png",
						}),
					},
				],
			}),
		});
		getAdminFirestoreMock.mockReturnValue({
			collection: vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue({ exists: false }),
				}),
			}),
		});

		const result = await getImageDataFromId("photo-1");

		expect(bucketMock.file).toHaveBeenCalledWith("uploads/photo.png");
		expect(result.mimeType).toBe("image/png");
		expect(result.data).toBe(Buffer.from("binary").toString("base64"));
	});

	it("downloads image from URL when storage path is missing", async () => {
		queryUploadedPhotosByPhotoIdMock.mockReturnValue({
			get: async () => ({
				docs: [
					{
						data: () => ({
							imageUrl: "https://example.com/photo.jpg",
						}),
					},
				],
			}),
		});
		getAdminStorageMock.mockReturnValue({
			bucket: vi.fn(() => ({
				file: vi.fn(),
				name: "photo-bucket",
			})),
		});
		global.fetch = vi.fn(async () => ({
			ok: true,
			arrayBuffer: async () => new TextEncoder().encode("hello"),
			headers: new Map([["content-type", "image/jpeg"]]),
		})) as unknown as typeof fetch;
		getAdminFirestoreMock.mockReturnValue({
			collection: vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue({ exists: false }),
				}),
			}),
		});

		const result = await getImageDataFromId("photo-2");

		expect(result.mimeType).toBe("image/jpeg");
		expect(result.data).toBe(Buffer.from("hello").toString("base64"));
	});

	it("falls back to options collection when uploaded photo not found", async () => {
		queryUploadedPhotosByPhotoIdMock.mockReturnValue({
			get: async () => ({
				docs: [],
			}),
		});

		const fileMock = {
			download: vi.fn(async () => [Buffer.from("option")]),
			getMetadata: vi.fn(async () => [null]),
		};
		const bucketMock = {
			file: vi.fn(() => fileMock),
			name: "photo-bucket",
		};
		getAdminStorageMock.mockReturnValue({
			bucket: vi.fn(() => bucketMock),
		});

		getAdminFirestoreMock.mockReturnValue({
			collection: vi.fn((collectionName: string) => {
				expect(collectionName).toBe("options");
				return {
					doc: vi.fn((docId: string) => {
						expect(docId).toBe("option-1");
						return {
							get: vi.fn(async () => ({
								exists: true,
								data: () => ({
									imagePath: "options/location/option.png",
								}),
							})),
						};
					}),
				};
			}),
		});

		const result = await getImageDataFromId("option-1");

		expect(result.mimeType).toBe("image/png");
		expect(result.data).toBe(Buffer.from("option").toString("base64"));
	});

	it("throws when image data cannot be located", async () => {
		queryUploadedPhotosByPhotoIdMock.mockReturnValue({
			get: async () => ({
				docs: [],
			}),
		});
		getAdminFirestoreMock.mockReturnValue({
			collection: vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue({ exists: false }),
				}),
			}),
		});
		getAdminStorageMock.mockReturnValue({
			bucket: vi.fn(() => ({
				file: vi.fn(),
				name: "photo-bucket",
			})),
		});

		await expect(getImageDataFromId("missing")).rejects.toThrowError(
			"Image data not found for id: missing",
		);
	});
});
