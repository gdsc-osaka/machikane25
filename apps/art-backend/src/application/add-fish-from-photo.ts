import { randomUUID } from "node:crypto";

import type { Fish } from "../domain/fish/fish.js";
import { createFish } from "../domain/fish/fish.js";
import { deriveFishColor } from "../domain/fish/fish-color.js";
import { validatePhoto } from "../domain/fish/photo.js";
import { AppError } from "../errors/app-error.js";
import { UseCaseError } from "../errors/use-case-error.js";
import type { AddFishDeps, AddFishParams, FishDTO } from "./ports.js";

const BYTES_PER_MEGABYTE = 1024 * 1024;

const toMaxSizeBytes = (maxPhotoSizeMb: number) =>
	Math.max(1, Math.floor(maxPhotoSizeMb * BYTES_PER_MEGABYTE));

const toFishDto = (fish: Fish): FishDTO =>
	Object.freeze({
		id: fish.id,
		imageUrl: fish.imageUrl,
		color: fish.color,
	});

const logWithCorrelation =
	(logger: AddFishDeps["logger"], correlationId: string) =>
	(
		level: "info" | "warn" | "error",
		message: string,
		context?: Record<string, unknown>,
	) => {
		logger[level](message, {
			correlationId,
			...(context ?? {}),
		});
	};

export const createAddFishFromPhoto = (
	deps: AddFishDeps,
): ((params: AddFishParams) => Promise<FishDTO>) => {
	return async ({ photo, correlationId }) => {
		const log = logWithCorrelation(deps.logger, correlationId);
		const maxSizeBytes = toMaxSizeBytes(deps.config.maxPhotoSizeMb);

		try {
			log("info", "addFishFromPhoto.validate.start");
			validatePhoto({
				buffer: photo.buffer,
				meta: {
					mimeType: photo.mimeType,
					size: photo.size,
				},
				limits: {
					maxSizeBytes,
				},
			});
			log("info", "addFishFromPhoto.validate.success");

			log("info", "addFishFromPhoto.blur.start");
			const blurredBuffer = await deps.imageProcessor.blur(photo.buffer);
			log("info", "addFishFromPhoto.blur.success", {
				blurredBytes: blurredBuffer.byteLength,
			});

			log("info", "addFishFromPhoto.extractHsv.start");
			const hsvPixels = await deps.imageProcessor.extractHSV(blurredBuffer);
			log("info", "addFishFromPhoto.extractHsv.success", {
				pixelCount: hsvPixels.length,
			});

			const color = deriveFishColor(Array.from(hsvPixels));
			log("info", "addFishFromPhoto.color.derived", { color });

			const id = randomUUID();
			log("info", "addFishFromPhoto.storage.upload.start", { id });
			const uploadResult = await deps.storage.upload({
				id,
				buffer: blurredBuffer,
				mimeType: photo.mimeType,
			});
			log("info", "addFishFromPhoto.storage.upload.success", uploadResult);

			const fish = createFish({
				id,
				imageUrl: uploadResult.imageUrl,
				imagePath: uploadResult.imagePath,
				color,
				createdAt: new Date(),
			});
			log("info", "addFishFromPhoto.fish.created", { id });

			await deps.repo.save(fish);
			log("info", "addFishFromPhoto.repo.saved", { id });

			return toFishDto(fish);
		} catch (error) {
			if (error instanceof AppError) {
				log("error", "addFishFromPhoto.failed", {
					code: error.code,
					name: error.name,
					error,
				});
				throw error;
			}

			log("error", "addFishFromPhoto.unexpected", {
				name: error instanceof Error ? error.name : "UnknownError", error,
			});

			throw new UseCaseError({
				message: "Failed to add fish from photo",
				code: "ADD_FISH_UNEXPECTED",
				context: { correlationId },
				cause: error,
			});
		}
	};
};
