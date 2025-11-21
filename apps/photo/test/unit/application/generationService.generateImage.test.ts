import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GEMINI_FLASH_IMAGE_MODEL_ID } from "@/domain/models";

const createGeneratedPhotoMock = vi.fn();
const getImageDataFromIdMock = vi.fn();
const handleGeminiResponseMock = vi.fn();
const generateContentMock = vi.fn();
const fetchOptionsByIdsMock = vi.fn();

vi.mock("@/infra/firebase/photoRepository", () => ({
	createGeneratedPhoto: createGeneratedPhotoMock,
}));

vi.mock("@/infra/firebase/generationOptionRepository", () => ({
	fetchOptionsByIds: fetchOptionsByIdsMock,
}));

vi.mock("@/infra/gemini/imageData", () => ({
	getImageDataFromId: getImageDataFromIdMock,
}));

vi.mock("@/infra/gemini/storage", () => ({
	handleGeminiResponse: handleGeminiResponseMock,
}));

vi.mock("@google/genai", () => ({
	GoogleGenAI: vi.fn().mockImplementation(() => ({
		models: {
			generateContent: generateContentMock,
		},
	})),
}));

describe("GenerationService.generateImage", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = {
			...originalEnv,
			GEMINI_API_KEY: "test-api-key",
		};
		generateContentMock.mockReset();
		getImageDataFromIdMock.mockReset();
		handleGeminiResponseMock.mockReset();
		createGeneratedPhotoMock.mockReset();
		fetchOptionsByIdsMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("constructs interleaved Gemini request and stores generated photo metadata", async () => {
		const { generateImage } = await import("@/application/generationService");

		fetchOptionsByIdsMock.mockResolvedValue([
			{
				id: "location-id",
				typeId: "location",
				value: "Tokyo",
				displayName: "Tokyo",
				imageUrl: null,
				imagePath: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "outfit-id",
				typeId: "outfit",
				value: "sweater",
				displayName: "Sweater",
				imageUrl: null,
				imagePath: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		getImageDataFromIdMock.mockImplementation((id: string) => {
			if (id === "uploaded-photo") {
				return Promise.resolve({
					mimeType: "image/jpeg",
					data: "base-image-base64",
				});
			}
			if (id === "location-id") {
				return Promise.resolve({
					mimeType: "image/png",
					data: "location-image-base64",
				});
			}
			if (id === "outfit-id") {
				return Promise.resolve({
					mimeType: "image/png",
					data: "outfit-image-base64",
				});
			}
			throw new Error(`Unexpected image id: ${id}`);
		});

		const generatedBase64 = "aGVsbG8gd29ybGQ="; // "hello world" in base64 for deterministic buffer

		generateContentMock.mockResolvedValue({
			candidates: [
				{
					content: {
						parts: [
							{
								inlineData: {
									mimeType: "image/png",
									data: generatedBase64,
								},
							},
						],
					},
				},
			],
		});

		handleGeminiResponseMock.mockResolvedValue({
			imagePath: "generated_photos/photo-abc/photo.png",
			imageUrl: "https://example.com/generated/photo-abc.png",
		});

		const result = await generateImage(
			"booth-123",
			"uploaded-photo",
			{
				location: "location-id",
				outfit: "outfit-id",
			},
			"photo-abc",
		);

		expect(generateContentMock).toHaveBeenCalledOnce();
		const callArgs = generateContentMock.mock.calls[0]?.[0];

		expect(callArgs.model).toBe(GEMINI_FLASH_IMAGE_MODEL_ID);
		expect(callArgs.config).toEqual({
			imageConfig: {
				aspectRatio: "3:4",
			},
		});

		const expectedBuffer = Buffer.from(generatedBase64, "base64");

		expect(handleGeminiResponseMock).toHaveBeenCalledWith(
			expectedBuffer,
			"booth-123",
			"image/png",
		);

		expect(createGeneratedPhotoMock).toHaveBeenCalledWith({
			boothId: "booth-123",
			photoId: "photo-abc",
			imagePath: "generated_photos/photo-abc/photo.png",
			imageUrl: "https://example.com/generated/photo-abc.png",
			modelId: GEMINI_FLASH_IMAGE_MODEL_ID,
			status: "completed",
		});

		expect(result).toBe("photo-abc");
	}, 30000);

	it("throws descriptive error when Gemini API response lacks inline data", async () => {
		const { generateImage } = await import("@/application/generationService");

		fetchOptionsByIdsMock.mockResolvedValue([]);

		getImageDataFromIdMock.mockResolvedValue({
			mimeType: "image/jpeg",
			data: "base-image",
		});

		generateContentMock.mockResolvedValue({
			candidates: [
				{
					content: {
						parts: [
							{
								text: "no inline data here",
							},
						],
					},
				},
			],
		});

		await expect(
			generateImage("booth-x", "photo-y", {}, "photo-z"),
		).rejects.toThrowError("Gemini response missing image data");
	}, 30000);
});
