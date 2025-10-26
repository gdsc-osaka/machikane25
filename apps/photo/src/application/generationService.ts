/**
 * T210 [FOUND] Application: GenerationService (Options)
 *
 * Service for managing generation options
 * Server-side only (uses Admin SDK)
 */

import type { GroupedGenerationOptions } from "@/domain/generationOption";
import { fetchAllOptions } from "@/infra/firebase/generationOptionRepository";

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
