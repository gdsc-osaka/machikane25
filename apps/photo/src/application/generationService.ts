/**
 * T210 [FOUND] Application: GenerationService (Options)
 *
 * Service for managing generation options
 * Server-side only (uses Admin SDK)
 */

import type {
	GenerationOption,
	GroupedGenerationOptions,
} from "@/domain/generationOption";
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
