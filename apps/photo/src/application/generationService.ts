import { GoogleGenAI, type Part } from "@google/genai";
import { captureException } from "@sentry/nextjs";
import { ulid } from "ulid";
import type { GroupedGenerationOptions } from "@/domain/generationOption";
import type { GeneratedPhoto as GeneratedPhotoRecord } from "@/domain/photo";
import { fetchAllOptions } from "@/infra/firebase/generationOptionRepository";
import {
	createGeneratedPhoto,
	findGeneratedPhoto,
} from "@/infra/firebase/photoRepository";
import { getImageDataFromId } from "@/infra/gemini/imageData";
import { handleGeminiResponse, storageBucket } from "@/infra/gemini/storage";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

type GeminiInlineData = {
	mimeType: string;
	data: string;
};

type GeneratedPhotoInfo = {
	id: string;
	imageUrl: string;
};

const createNamedError = (name: string, message: string): Error => {
	const error = new Error(message);
	error.name = name;
	return error;
};

const isNamedError = (value: unknown, expectedName: string): boolean => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const name = Reflect.get(value, "name");
	return name === expectedName;
};

export const isPhotoNotFoundError = (value: unknown): boolean =>
	isNamedError(value, "PhotoNotFoundError");

export const isPhotoExpiredError = (value: unknown): boolean =>
	isNamedError(value, "PhotoExpiredError");

const ensureApiKey = (): string => {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey || apiKey.length === 0) {
		throw new Error("GEMINI_API_KEY is not defined");
	}
	return apiKey;
};

const toParts = (
	baseImage: GeminiInlineData,
	optionEntries: Array<{ key: string; inlineData: GeminiInlineData }>,
): Part[] => {
	const optionParts = optionEntries.flatMap<Part>((entry) => [
		{ text: `This image is for the '${entry.key}':` },
		{
			inline_data: {
				mime_type: entry.inlineData.mimeType,
				data: entry.inlineData.data,
			},
		},
	]);

	return [
		{ text: "This is the base 'reference_image' person:" },
		{ inlineData: { mimeType: baseImage.mimeType, data: baseImage.data } },
		...optionParts,
		{
			text: "Generate an image using the 'reference_image' person. Beside the 'reference_image' person, add the 'person' to create a two-shot scene. The 'reference_image' person should be wearing the 'outfit'. Both persons should be in the 'pose', at the 'location'. The overall image style should be the 'style'.",
		},
	];
};

const extractInlineData = (payload: unknown): GeminiInlineData | null => {
	if (typeof payload !== "object" || payload === null) {
		return null;
	}
	const candidates = Reflect.get(payload, "candidates");
	if (!Array.isArray(candidates)) {
		return null;
	}
	const firstCandidate = candidates[0];
	if (typeof firstCandidate !== "object" || firstCandidate === null) {
		return null;
	}
	const content = Reflect.get(firstCandidate, "content");
	if (typeof content !== "object" || content === null) {
		return null;
	}
	const parts = Reflect.get(content, "parts");
	if (!Array.isArray(parts)) {
		return null;
	}
	const targetPart = parts.find((part) => {
		if (typeof part !== "object" || part === null) {
			return false;
		}
		// Try both camelCase and snake_case for compatibility
		const inlineCandidate =
			Reflect.get(part, "inline_data") ?? Reflect.get(part, "inlineData");
		return typeof inlineCandidate === "object" && inlineCandidate !== null;
	});
	if (typeof targetPart !== "object" || targetPart === null) {
		return null;
	}
	// Try both camelCase and snake_case for compatibility
	const inlineData =
		Reflect.get(targetPart, "inline_data") ??
		Reflect.get(targetPart, "inlineData");
	if (typeof inlineData !== "object" || inlineData === null) {
		return null;
	}
	// Try both camelCase and snake_case for compatibility
	const data = Reflect.get(inlineData, "data");
	const mimeType =
		Reflect.get(inlineData, "mime_type") ?? Reflect.get(inlineData, "mimeType");
	if (typeof data !== "string" || typeof mimeType !== "string") {
		return null;
	}
	return { data, mimeType };
};

const derivePhotoId = (imagePath: string): string => {
	const segments = imagePath.split("/");
	const candidate = segments.length >= 2 ? segments[segments.length - 2] : "";
	if (candidate && candidate.length > 0) {
		return candidate;
	}
	return ulid().toLowerCase();
};

/**
 * Get all generation options grouped by typeId
 * Uses reduce to group options by typeId (AGENTS.md: prefer array methods over loops)
 *
 * @returns Promise resolving to grouped generation options
 *          Example: { location: [...], outfit: [...], style: [...] }
 */
export const getOptions = async (): Promise<GroupedGenerationOptions> => {
	const options = await fetchAllOptions();

	const grouped = options.reduce<GroupedGenerationOptions>(
		(accumulator, option) => {
			const typeId = option.typeId;
			const existingGroup = accumulator[typeId] ?? [];
			accumulator[typeId] = [...existingGroup, option];
			return accumulator;
		},
		{},
	);

	return grouped;
};

export const generateImage = async (
	boothId: string,
	uploadedPhotoId: string,
	options: Record<string, string>,
): Promise<string> => {
	const apiKey = ensureApiKey();
	const baseImage = await getImageDataFromId(uploadedPhotoId);

	const optionEntries = Object.entries(options);
	const optionData = await Promise.all(
		optionEntries.map(async ([key, imageId]) => {
			const inlineData = await getImageDataFromId(imageId);
			return { key, inlineData };
		}),
	);

	const parts = toParts(
		{
			mimeType: baseImage.mimeType,
			data: baseImage.data,
		},
		optionData,
	);

	const ai = new GoogleGenAI({ apiKey: apiKey });
	try {
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-image",
			contents: [
				{
					parts,
				},
			],
			config: {
				imageConfig: {
					aspectRatio: "3:4",
				},
			},
		});

		const inlineData = extractInlineData(response);
		if (!inlineData) {
			throw new Error("Gemini response missing image data");
		}

		const imageBuffer = Buffer.from(inlineData.data, "base64");
		const { imagePath, imageUrl } = await handleGeminiResponse(
			imageBuffer,
			boothId,
			inlineData.mimeType,
		);

		const photoId = derivePhotoId(imagePath);

		await createGeneratedPhoto({
			boothId,
			photoId,
			imagePath,
			imageUrl,
		});

		return photoId;
	} catch (error) {
		if (error instanceof Error) {
			captureException(error, {
				tags: { feature: "image-generation" },
				extra: {
					boothId,
					uploadedPhotoId,
					options,
				},
			});
			throw error;
		}
		const unknownError = new Error(
			"Image generation failed due to unknown error",
		);
		captureException(unknownError, {
			tags: { feature: "image-generation" },
			extra: {
				boothId,
				uploadedPhotoId,
				options,
				error,
			},
		});
		throw unknownError;
	}
};

type AquariumConfig = {
	endpoint: string;
	token: string;
};

const AQUARIUM_FEATURE_TAG = "aquarium-sync";

const ensureAquariumConfig = (): AquariumConfig => {
	const baseUrl = process.env.AQUARIUM_API_BASE_URL ?? "";
	const apiKey = process.env.AQUARIUM_API_KEY ?? "";

	if (!baseUrl) {
		throw new Error("AQUARIUM_API_BASE_URL is not defined");
	}

	const endpoint = `${baseUrl}/upload-photo`;
	return { endpoint, token: apiKey };
};

const buildAquariumHeaders = (apiKey: string): Record<string, string> => {
	if (!apiKey) {
		return {};
	}

	return {
		"X-API-KEY": apiKey,
	};
};

const downloadImageFromStorage = async (imagePath: string): Promise<Buffer> => {
	const bucket = storageBucket();
	const file = bucket.file(imagePath);
	const [buffer] = await file.download();
	return buffer;
};

const createMultipartFormData = async (
	photo: GeneratedPhotoRecord,
): Promise<FormData> => {
	const imageBuffer = await downloadImageFromStorage(photo.imagePath);
	const uint8Array = new Uint8Array(imageBuffer);
	const file = new File([uint8Array], "photo.png", { type: "image/png" });
	const formData = new FormData();
	formData.append("photo", file);
	return formData;
};

const createAquariumError = (message: string): Error => {
	const error = new Error(message);
	error.name = "AquariumSyncError";
	return error;
};

const reportAquariumFailure = (
	error: Error,
	photo: GeneratedPhotoRecord,
	additional: Record<string, unknown> = {},
) => {
	captureException(error, {
		tags: { feature: AQUARIUM_FEATURE_TAG },
		extra: {
			boothId: photo.boothId,
			photoId: photo.photoId,
			...additional,
		},
	});
};

export const sendToAquarium = async (
	photo: GeneratedPhotoRecord,
): Promise<void> => {
	const { endpoint, token } = ensureAquariumConfig();

	try {
		const formData = await createMultipartFormData(photo);
		const response = await fetch(endpoint, {
			method: "POST",
			headers: buildAquariumHeaders(token),
			body: formData,
		});

		if (!response.ok) {
			const responseText = await response.text().catch(() => "");
			const error = createAquariumError(
				`Aquarium sync failed with status ${response.status}`,
			);
			reportAquariumFailure(error, photo, {
				responseText,
				statusText: response.statusText,
			});
			throw error;
		}
	} catch (caughtError) {
		if (caughtError instanceof Error) {
			if (caughtError.name === "AquariumSyncError") {
				throw caughtError;
			}
			reportAquariumFailure(caughtError, photo);
			throw caughtError;
		}

		const unknownError = createAquariumError(
			"Aquarium sync failed due to unknown error",
		);
		reportAquariumFailure(unknownError, photo, { error: caughtError });
		throw unknownError;
	}
};

/**
 * Retrieve generated photo metadata by id.
 * Throws PhotoNotFoundError when document is missing and PhotoExpiredError when older than 24 hours.
 */
export const getGeneratedPhoto = async (
	boothId: string,
	photoId: string,
): Promise<GeneratedPhotoInfo> => {
	const photo = await findGeneratedPhoto(boothId, photoId);

	if (!photo) {
		throw createNamedError("PhotoNotFoundError", "Generated photo not found");
	}

	const ageInMs = Date.now() - photo.createdAt.getTime();

	if (ageInMs > ONE_DAY_IN_MS) {
		throw createNamedError(
			"PhotoExpiredError",
			"Generated photo download expired",
		);
	}

	return {
		id: photo.photoId,
		imageUrl: photo.imageUrl,
	};
};
