import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createGeneratedPhotoMock = vi.fn();
const getImageDataFromIdMock = vi.fn();
const handleGeminiResponseMock = vi.fn();

vi.mock("@/infra/firebase/photoRepository", () => ({
	createGeneratedPhoto: createGeneratedPhotoMock,
}));

vi.mock("@/infra/gemini/imageData", () => ({
	getImageDataFromId: getImageDataFromIdMock,
}));

vi.mock("@/infra/gemini/storage", () => ({
	handleGeminiResponse: handleGeminiResponseMock,
}));

describe("GenerationService.generateImage", () => {
	const originalEnv = { ...process.env };
	const fetchMock = vi.fn();

	beforeEach(() => {
		process.env = {
			...originalEnv,
			GEMINI_API_KEY: "test-api-key",
		};
		global.fetch = fetchMock as typeof fetch;
		fetchMock.mockReset();
		getImageDataFromIdMock.mockReset();
		handleGeminiResponseMock.mockReset();
		createGeneratedPhotoMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		Reflect.deleteProperty(global, "fetch");
	});

	it("constructs interleaved Gemini request and stores generated photo metadata", async () => {
		const { generateImage } = await import("@/application/generationService");

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

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
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
			}),
		});

		handleGeminiResponseMock.mockResolvedValue({
			imagePath: "generated_photos/photo-abc/photo.png",
			imageUrl: "https://example.com/generated/photo-abc.png",
		});

		const result = await generateImage("booth-123", "uploaded-photo", {
			location: "location-id",
			outfit: "outfit-id",
		});

		expect(fetchMock).toHaveBeenCalledOnce();
		const [requestedUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
		expect(requestedUrl).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
		);
		expect(requestInit?.method).toBe("POST");
		expect(requestInit?.headers).toMatchObject({
			"Content-Type": "application/json",
			"x-goog-api-key": "test-api-key",
		});

		const requestBody =
			typeof requestInit?.body === "string"
				? JSON.parse(requestInit.body)
				: null;

		expect(requestBody).not.toBeNull();
		expect(requestBody?.contents?.[0]?.parts).toEqual([
			{ text: "This is the base 'reference_image' person:" },
			{
				inline_data: {
					mime_type: "image/jpeg",
					data: "base-image-base64",
				},
			},
			{ text: "This image is for the 'location':" },
			{
				inline_data: {
					mime_type: "image/png",
					data: "location-image-base64",
				},
			},
			{ text: "This image is for the 'outfit':" },
			{
				inline_data: {
					mime_type: "image/png",
					data: "outfit-image-base64",
				},
			},
			{
				text: "Generate an image using the 'reference_image' person. Beside the 'reference_image' person, add the 'person' to create a two-shot scene. The 'reference_image' person should be wearing the 'outfit'. Both persons should be in the 'pose', at the 'location'. The overall image style should be the 'style'.",
			},
		]);

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
		});

		expect(result).toBe("photo-abc");
	}, 30000);

	it("throws descriptive error when Gemini API response lacks inline data", async () => {
		const { generateImage } = await import("@/application/generationService");

		getImageDataFromIdMock.mockResolvedValue({
			mimeType: "image/jpeg",
			data: "base-image",
		});

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
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
			}),
		});

		await expect(generateImage("booth-x", "photo-y", {})).rejects.toThrowError(
			"Gemini response missing image data",
		);
	}, 30000);
});
