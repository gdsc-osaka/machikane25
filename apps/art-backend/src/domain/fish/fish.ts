import { z } from "zod";

import { AppError } from "../../errors/app-error.js";

export type Fish = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: Date;
}>;

type FirestoreTimestamp = import("firebase-admin/firestore").Timestamp;

export type FishDocument = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: FirestoreTimestamp;
}>;

export type CreateFishInput = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: Date;
}>;

type FishValidationContext = Readonly<{
	invalidFields: readonly string[];
}>;

export class FishValidationError extends AppError {
	constructor(context: FishValidationContext) {
		super({
			message: "Invalid fish properties",
			code: "FISH_INVALID",
			name: "FishValidationError",
			context,
		});
	}
}

const colorSchema = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/)
	.transform((value) => value.toUpperCase());

const fishSchema = z.object({
	id: z.string().min(1),
	imageUrl: z.string().url(),
	imagePath: z.string().min(1),
	color: colorSchema,
	createdAt: z.date().refine((value) => !Number.isNaN(value.getTime()), {
		message: "Invalid Date provided for createdAt",
	}),
});

const extractInvalidFields = (issues: z.ZodIssue[]) =>
	Array.from(
		new Set(
			issues
				.map((issue) => issue.path[0])
				.filter((field): field is string => typeof field === "string"),
		),
	);

export const createFish = (input: CreateFishInput): Fish => {
	const result = fishSchema.safeParse(input);
	if (!result.success) {
		throw new FishValidationError({
			invalidFields: extractInvalidFields(result.error.issues),
		});
	}

	const fish: Fish = {
		...result.data,
	};

	return Object.freeze(fish);
};

export const isExpired = (
	args: Readonly<{
		fish: Fish;
		now: Date;
		ttlMinutes: number;
	}>,
): boolean => {
	const nowTime = args.now.getTime();
	const createdTime = args.fish.createdAt.getTime();
	if (Number.isNaN(nowTime) || Number.isNaN(createdTime)) {
		return true;
	}
	if (nowTime <= createdTime) {
		return false;
	}
	const ttlMs = args.ttlMinutes * 60 * 1000;
	const ageMs = nowTime - createdTime;
	return ageMs >= ttlMs;
};
