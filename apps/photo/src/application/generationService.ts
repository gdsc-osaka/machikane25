/**
 * T210 [FOUND] Application: GenerationService (Options)
 *
 * Service for managing generation options
 * Server-side only (uses Admin SDK)
 */

import type { GroupedGenerationOptions } from "@/domain/generationOption";
import { fetchAllOptions } from "@/infra/firebase/generationOptionRepository";
import { findGeneratedPhoto } from "@/infra/firebase/photoRepository";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

type GeneratedPhoto = {
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

/**
 * Get all generation options grouped by typeId
 * Uses reduce to group options by typeId (AGENTS.md: prefer array methods over loops)
 *
 * @returns Promise resolving to grouped generation options
 *          Example: { location: [...], outfit: [...], style: [...] }
 */
export const getOptions = async (): Promise<GroupedGenerationOptions> => {
	const options = await fetchAllOptions();

	// Group options by typeId using reduce (AGENTS.md: prefer functional programming)
	const grouped = options.reduce<GroupedGenerationOptions>(
		(accumulator, option) => {
			const typeId = option.typeId;
			const existingGroup = accumulator[typeId] ?? [];
			return {
				...accumulator,
				[typeId]: [...existingGroup, option],
			};
		},
		{},
	);

	return grouped;
};

/**
 * Placeholder for Gemini generation (implemented in later tasks).
 */
export const generateImage = async (
	boothId: string,
	uploadedPhotoId: string,
	options: Record<string, string>,
): Promise<void> => {
	const apiKey = process.env.GEMINI_API_KEY ?? "";
	const endpoint =
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

	await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": apiKey,
		},
		body: JSON.stringify({
			boothId,
			uploadedPhotoId,
			options,
		}),
	});
};

/**
 * Retrieve generated photo metadata by id.
 * Throws PhotoNotFoundError when document is missing and PhotoExpiredError when older than 24 hours.
 */
export const getGeneratedPhoto = async (
	boothId: string,
	photoId: string,
): Promise<GeneratedPhoto> => {
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
