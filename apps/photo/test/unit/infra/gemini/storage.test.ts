import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminStorageMock, bucketMock, saveMock } = vi.hoisted(() => {
	const saveMock = vi.fn();
	const bucketMock = {
		file: vi.fn(),
		name: "photo-bucket",
	};
	return {
		getAdminStorageMock: vi.fn(),
		bucketMock,
		saveMock,
	};
});

vi.mock("@/lib/firebase/admin", () => ({
	getAdminStorage: getAdminStorageMock,
}));

vi.mock("ulid", () => ({
	ulid: () => "01HZXVY3P0BN6H6A9SR3J5K7KJ",
}));

import { handleGeminiResponse, storageBucket } from "@/infra/gemini/storage";

describe("infra/gemini/storage", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		getAdminStorageMock.mockReset();
		bucketMock.file.mockReset();
		saveMock.mockReset();
		bucketMock.file.mockImplementation(() => ({
			save: saveMock.mockResolvedValue(undefined),
		}));
		getAdminStorageMock.mockReturnValue({
			bucket: vi.fn((name?: string) => {
				if (name) {
					expect(name).toBe(process.env.FIREBASE_STORAGE_BUCKET);
				}
				return bucketMock;
			}),
		});
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("returns configured bucket when FIREBASE_STORAGE_BUCKET is set", () => {
		process.env.FIREBASE_STORAGE_BUCKET = "custom-bucket";

		const bucket = storageBucket();

		expect(bucket).toBe(bucketMock);
		expect(getAdminStorageMock).toHaveBeenCalled();
	});

	it("falls back to default bucket when no explicit name provided", () => {
		delete process.env.FIREBASE_STORAGE_BUCKET;

		const bucket = storageBucket();

		expect(bucket).toBe(bucketMock);
	});

	it("uploads generated image and returns public URL", async () => {
		process.env.FIREBASE_STORAGE_BUCKET = "photo-bucket";
		process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";

		const result = await handleGeminiResponse(
			Buffer.from("result"),
			"booth-1",
			"image/png",
		);

		expect(bucketMock.file).toHaveBeenCalledWith(
			"generated_photos/booth-1/01hzxvy3p0bn6h6a9sr3j5k7kj/photo.png",
		);
		expect(saveMock).toHaveBeenCalledWith(Buffer.from("result"), {
			resumable: false,
			contentType: "image/png",
			metadata: { cacheControl: "public,max-age=3600" },
			validation: false,
		});
		expect(result).toEqual({
			imagePath:
				"generated_photos/booth-1/01hzxvy3p0bn6h6a9sr3j5k7kj/photo.png",
			imageUrl:
				"http://localhost:9199/v0/b/photo-bucket/o/generated_photos%2Fbooth-1%2F01hzxvy3p0bn6h6a9sr3j5k7kj%2Fphoto.png?alt=media",
		});
	});

	it("derives extension based on mime type", async () => {
		process.env.FIREBASE_STORAGE_BUCKET = "photo-bucket";
		delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

		const result = await handleGeminiResponse(
			Buffer.from("data"),
			"booth-2",
			"image/webp",
		);

		expect(result.imagePath.endsWith("photo.webp")).toBe(true);
		expect(result.imageUrl.startsWith("https://storage.googleapis.com")).toBe(
			true,
		);
	});
});
