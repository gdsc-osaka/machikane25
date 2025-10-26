/**
 * Domain: GenerationOption
 *
 * Template selection options for AI generation (Location/Outfit/Person/Style/Pose)
 * Based on data-model.md
 */

/**
 * Type IDs for generation options
 */
export type GenerationOptionTypeId =
  | "location"
  | "outfit"
  | "person"
  | "style"
  | "pose";

/**
 * GenerationOption entity
 */
export interface GenerationOption {
  id: string;
  typeId: GenerationOptionTypeId;
  value: string;
  displayName: string;
  imageUrl: string | null;
  imagePath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Grouped generation options by typeId
 */
export type GroupedGenerationOptions = Record<
  string,
  GenerationOption[]
>;
