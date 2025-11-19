import { type Content, GoogleGenAI } from "@google/genai";
import { captureException } from "@sentry/nextjs";
import { ulid } from "ulid";
import type { GroupedGenerationOptions } from "@/domain/generationOption";
import type { GeneratedPhoto as GeneratedPhotoRecord } from "@/domain/photo";
import {
	fetchAllOptions,
	fetchOptionsByIds,
} from "@/infra/firebase/generationOptionRepository";
import {
	createGeneratedPhoto,
	findGeneratedPhoto,
	findGeneratedPhotos,
} from "@/infra/firebase/photoRepository";
import { getAdminFirestore } from "@/lib/firebase/admin";
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
	relatedPhotos?: { id: string; imageUrl: string }[];
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

export const toContents = (
	baseImage: GeminiInlineData,
	optionEntries: Array<{
		key: string;
		value: string;
		inlineData: GeminiInlineData;
	}>,
): Content[] => {
	const personOption = optionEntries.find((entry) => entry.key === "person");
	const styleOption = optionEntries.find((entry) => entry.key === "style");
	const poseOption = optionEntries.find((entry) => entry.key === "pose");
	const locationOption = optionEntries.find(
		(entry) => entry.key === "location",
	);
	const outfitOption = optionEntries.find((entry) => entry.key === "outfit");

	const contents: Content[] = [
		{
			parts: [
				{
					text: "You are an expert image generation AI for photo booth applications. Keep the original person's face exactly the same, while changing their outfit, location. Avoid changing the facial expression.",
				},
			],
		},
		{
			parts: [
				{
					text: "[Original photo]",
				},
				{
					inlineData: {
						mimeType: baseImage.mimeType,
						data: baseImage.data,
					},
				},
			],
		},
	];

	if (personOption?.inlineData) {
		contents.push({
			parts: [
				{
					text: "[Partner photo]",
				},
				{
					inlineData: {
						mimeType: personOption.inlineData.mimeType,
						data: personOption.inlineData.data,
					},
				},
			],
		});
	}

	// if (locationOption?.inlineData) {
	// 	contents.push({
	// 		parts: [
	// 			{
	// 				text: "[Location photo]",
	// 			},
	// 			{
	// 				inlineData: {
	// 					mimeType: locationOption.inlineData.mimeType,
	// 					data: locationOption.inlineData.data,
	// 				},
	// 			},
	// 		],
	// 	});
	// }

	// if (outfitOption?.inlineData) {
	// 	contents.push({
	// 		parts: [
	// 			{
	// 				text: "[Outfit photo]",
	// 			},
	// 			{
	// 				inlineData: {
	// 					mimeType: outfitOption.inlineData.mimeType,
	// 					data: outfitOption.inlineData.data,
	// 				},
	// 			},
	// 		],
	// 	});
	// }

	contents.push({
		parts: [
			{
				text:
					`${styleOption?.value}. ` +
					`The people from the [Original photo] are ${poseOption?.value}, ` +
					`wearing ${outfitOption?.value}, ` +
					`in ${locationOption?.value}. ` +
					`${
						personOption?.inlineData
							? "The partner from the [Partner photo] is next to them, also wearing the same outfit"
							: `${personOption?.value} is next to them, also wearing the same outfit`
					}.`,
			},
		],
	});

	return contents;
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
	console.debug("generateImage");
	const apiKey = ensureApiKey();
	console.debug("API key ensured");
	const baseImage = await getImageDataFromId(uploadedPhotoId, boothId);
	console.debug("Base image data retrieved");

	// Fetch all options to get the value data
	const allOptions = await fetchOptionsByIds(Object.values(options));
	console.debug("All options fetched");

	const optionEntries = Object.entries(options);
	const optionData = await Promise.all(
		optionEntries.map(async ([key, optionId]) => {
			const inlineData = await getImageDataFromId(optionId, boothId);
			// Find the matching option to get its value
			const matchedOption = allOptions.find((opt) => opt.id === optionId);
			const value = matchedOption?.value ?? "";
			return { key, value, inlineData };
		}),
	);
	console.debug("Option image data retrieved");

	const ai = new GoogleGenAI({ apiKey: apiKey });
	try {
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-image",
			contents: toContents(
				{
					mimeType: baseImage.mimeType,
					data: baseImage.data,
				},
				optionData,
			),
			config: {
				imageConfig: {
					aspectRatio: "3:4",
				},
			},
		});
		console.debug("Gemini response received: ", response);

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
		console.log("Generated image stored at: ", imagePath);

		const photoId = derivePhotoId(imagePath);

		await createGeneratedPhoto({
			boothId,
			photoId,
			imagePath,
			imageUrl,
		});
		console.log("Generated photo metadata created with ID: ", photoId);

		return photoId;
	} catch (error) {
		console.error("Image generation failed: ", error);
		if (error instanceof Error) {
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

	const boothRef = getAdminFirestore().collection("booths").doc(boothId);
	const boothSnapshot = await boothRef.get();
	let relatedPhotos: { id: string; imageUrl: string }[] = [];

	if (boothSnapshot.exists) {
		const boothData = boothSnapshot.data();
		const latestPhotoIds = Reflect.get(boothData || {}, "latestPhotoIds");

		if (
			Array.isArray(latestPhotoIds) &&
			latestPhotoIds.includes(photo.photoId)
		) {
			const photos = await findGeneratedPhotos(boothId, latestPhotoIds);
			relatedPhotos = photos.map((p) => ({
				id: p.photoId,
				imageUrl: p.imageUrl,
			}));
		}
	}

	return {
		id: photo.photoId,
		imageUrl: photo.imageUrl,
		relatedPhotos,
	};
};
