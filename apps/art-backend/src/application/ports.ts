import type { Config } from "../config/env.js";
import type { Fish } from "../domain/fish/fish.js";
import type { HSVPixel } from "../domain/fish/fish-color.js";
import type { Photo } from "../domain/fish/photo.js";

export type FishDTO = Readonly<{
	id: string;
	imageUrl: string;
	color: string;
}>;

/**
 * @throws {import("../errors/app-error.js").AppError}
 */
export type FishRepository = Readonly<{
	save(fish: Fish): Promise<void>;
	list(): Promise<readonly Fish[]>;
}>;

/**
 * @throws {import("../errors/app-error.js").AppError}
 */
export type PhotoStorage = Readonly<{
	upload(
		args: Readonly<{
			id: string;
			buffer: Buffer;
			mimeType: string;
		}>,
	): Promise<
		Readonly<{
			imageUrl: string;
			imagePath: string;
		}>
	>;
}>;

/**
 * @throws {import("../errors/app-error.js").AppError}
 */
export type ImageProcessor = Readonly<{
	blur(buffer: Buffer): Promise<Buffer>;
	extractHSV(buffer: Buffer): Promise<readonly HSVPixel[]>;
}>;

export type Logger = Readonly<{
	info: (message: string, context?: Record<string, unknown>) => void;
	warn: (message: string, context?: Record<string, unknown>) => void;
	error: (message: string, context?: Record<string, unknown>) => void;
}>;

export type AddFishDeps = Readonly<{
	repo: FishRepository;
	storage: PhotoStorage;
	imageProcessor: ImageProcessor;
	config: Config;
	logger: Logger;
}>;

export type ListFishDeps = Readonly<{
	repo: FishRepository;
	config: Config;
	logger: Logger;
}>;

export type AddFishParams = Readonly<{
	photo: Photo;
	correlationId: string;
}>;

export type ListFishParams = Readonly<{
	correlationId?: string;
}>;
