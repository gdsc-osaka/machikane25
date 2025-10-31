import { z } from "zod";

/**
 * Booth state representation (data-model.md)
 */
export const boothStateSchema = z.union([
	z.literal("idle"),
	z.literal("menu"),
	z.literal("capturing"),
	z.literal("generating"),
	z.literal("completed"),
]);

export type BoothState = z.infer<typeof boothStateSchema>;

/**
 * Booth aggregate per data model
 */
export const boothSchema = z.object({
	id: z.string(),
	state: boothStateSchema,
	latestPhotoId: z.string().nullable(),
	lastTakePhotoAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type Booth = z.infer<typeof boothSchema>;

/**
 * Validates incoming booth state transitions.
 * Only ensures state value belongs to schema; other Firestore sentinel values are handled at runtime.
 */
export const ensureValidBoothState = (state: BoothState | undefined): void => {
	if (typeof state === "undefined") {
		return;
	}
	boothStateSchema.parse(state);
};
