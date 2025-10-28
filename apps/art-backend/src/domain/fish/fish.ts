import type { Timestamp } from "firebase-admin/firestore";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { createValidationError, type ValidationError } from "./errors";

export type Fish = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: Date;
}>;

export type FishDocument = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: Timestamp;
}>;

export type CreateFishInput = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: Date;
}>;

const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;
const IMAGE_PATH_PREFIX = "fish_images/";

export const fishSchema = z
	.object({
		id: z.string().min(1, { message: "id must be a non-empty string" }),
		imageUrl: z
			.string()
			.url({ message: "imageUrl must be a valid URL" })
			.refine(
				(value) => value.startsWith("https://"),
				"imageUrl must be served over https",
			),
		imagePath: z
			.string()
			.min(1, { message: "imagePath must be a non-empty string" })
			.refine(
				(value) => value.startsWith(IMAGE_PATH_PREFIX),
				`imagePath must start with "${IMAGE_PATH_PREFIX}"`,
			),
		color: z
			.string()
			.regex(HEX_COLOR_REGEX, {
				message: "color must be a hex string in the format #RRGGBB",
			})
			.transform((value) => value.toUpperCase()),
		createdAt: z.date(),
	})
	.strict()
	.readonly();

export const createFish = (
	input: CreateFishInput,
): Result<Fish, ValidationError> => {
	const parsed = fishSchema.safeParse(input);

	if (!parsed.success) {
		const issueMessage = parsed.error.issues
			.map((issue) =>
				issue.path.length > 0
					? `${issue.path.join(".")}: ${issue.message}`
					: issue.message,
			)
			.join(", ");

		return err(
			createValidationError(
				issueMessage.length > 0
					? `fish validation failed: ${issueMessage}`
					: "fish validation failed",
				{
					issues: parsed.error.issues,
				},
			),
		);
	}

	return ok(Object.freeze(parsed.data));
};

export const isExpired = ({
	fish,
	now,
	ttlMinutes,
}: {
	fish: Fish;
	now: Date;
	ttlMinutes: number;
}): boolean => {
	if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
		return false;
	}

	const ttlMs = ttlMinutes * 60 * 1000;
	const elapsed = now.getTime() - fish.createdAt.getTime();

	return elapsed >= ttlMs;
};
