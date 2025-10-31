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

export const generatedPhotoSchema = z.object({
	boothId: boothIdSchema,
	photoId: photoIdSchema,
	imagePath: storagePathSchema,
	imageUrl: urlSchema,
	createdAt: z.date(),
});

export type GeneratedPhoto = z.infer<typeof generatedPhotoSchema>;

export const ensureUploadedPhoto = (value: unknown): UploadedPhoto =>
	uploadedPhotoSchema.parse(value);

export const ensureGeneratedPhoto = (value: unknown): GeneratedPhoto =>
	generatedPhotoSchema.parse(value);
