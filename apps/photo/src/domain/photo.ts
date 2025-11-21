import { z } from "zod";

const boothIdSchema = z.string().min(1);
const photoIdSchema = z.string().min(1);
const storagePathSchema = z.string().min(1);
const urlSchema = z.string().url();

export const uploadedPhotoSchema = z.object({
	boothId: boothIdSchema,
	photoId: photoIdSchema,
	imagePath: storagePathSchema,
	imageUrl: urlSchema,
	createdAt: z.date(),
});

export type UploadedPhoto = z.infer<typeof uploadedPhotoSchema>;

export const generatedPhotoSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("completed"),
		boothId: boothIdSchema,
		photoId: photoIdSchema,
		imagePath: storagePathSchema,
		imageUrl: urlSchema,
		modelId: z.string().optional(),
		createdAt: z.date(),
	}),
	z.object({
		status: z.literal("generating"),
		boothId: boothIdSchema,
		photoId: photoIdSchema,
		imagePath: z.string(),
		imageUrl: z.string(),
		modelId: z.string().optional(),
		createdAt: z.date(),
	}),
	z.object({
		status: z.literal("failed"),
		boothId: boothIdSchema,
		photoId: photoIdSchema,
		imagePath: z.string(),
		imageUrl: z.string(),
		modelId: z.string().optional(),
		createdAt: z.date(),
	}),
]);

export type GeneratedPhoto = z.infer<typeof generatedPhotoSchema>;

export const ensureUploadedPhoto = (value: unknown): UploadedPhoto =>
	uploadedPhotoSchema.parse(value);

export const ensureGeneratedPhoto = (value: unknown): GeneratedPhoto =>
	generatedPhotoSchema.parse(value);
