import { randomUUID } from "node:crypto";
import type { Handler } from "hono";

import type { FishDTO, Logger } from "../../application/ports.js";
import type { Config } from "../../config/env.js";
import type { Photo } from "../../domain/fish/photo.js";
import { AppError } from "../../errors/app-error.js";
import { RequestValidationError } from "../../errors/request-validation-error.js";
import { UseCaseError } from "../../errors/use-case-error.js";
import type { ControllerEnv } from "../types.js";
import { getCorrelationId } from "../types.js";

export type UploadHandlerDeps = Readonly<{
	addFishFromPhoto: (
		params: Readonly<{ photo: Photo; correlationId: string }>,
	) => Promise<FishDTO>;
	logger: Logger;
	config: Config;
}>;

const logWithCorrelation = (logger: Logger, correlationId: string) => {
	return (
		level: "info" | "warn" | "error",
		message: string,
		context?: Record<string, unknown>,
	) => {
		logger[level](message, {
			correlationId,
			...(context ?? {}),
		});
	};
};

const toBuffer = async (file: File) => {
	const arrayBuffer = await file.arrayBuffer();
	return Buffer.from(arrayBuffer);
};

const createPhotoPayload = async (file: File): Promise<Photo> => {
	const buffer = await toBuffer(file);
	return Object.freeze({
		buffer,
		mimeType: file.type,
		size: Number(file.size),
	});
};

const extractPhoto = async (form: FormData): Promise<Photo> => {
	const value = form.get("photo");
	if (!(value instanceof File)) {
		throw new RequestValidationError({
			message: "photo field is required",
			details: { field: "photo" },
		});
	}
	return createPhotoPayload(value);
};

export const createUploadPhotoHandler = (
	deps: UploadHandlerDeps,
): Handler<ControllerEnv> => {
	return async (c) => {
		const correlationId = getCorrelationId(c) ?? randomUUID();
		const log = logWithCorrelation(deps.logger, correlationId);

		try {
			log("info", "uploadPhoto.parse.start", {
				maxPhotoSizeMb: deps.config.maxPhotoSizeMb,
			});
			const form = await c.req.raw.formData();
			const photo = await extractPhoto(form);
			log("info", "uploadPhoto.parse.success", {
				mimeType: photo.mimeType,
				size: photo.size,
			});

			log("info", "uploadPhoto.useCase.start");
			const fish = await deps.addFishFromPhoto({
				photo,
				correlationId,
			});
			log("info", "uploadPhoto.useCase.success", { id: fish.id });

			return c.json(fish);
		} catch (error) {
			if (error instanceof RequestValidationError) {
				log("warn", "uploadPhoto.validation.failed", {
					code: error.code,
					details: error.context,
				});
				throw error;
			}

			if (error instanceof AppError) {
				log("error", "uploadPhoto.useCase.failed", {
					code: error.code,
					name: error.name,
				});
				throw error;
			}

			log("error", "uploadPhoto.unexpected", {
				name: error instanceof Error ? error.name : "UnknownError",
				message:
					error instanceof Error ? error.message : String(error ?? "unknown"),
			});

			throw new UseCaseError({
				message: "Upload handler failed",
				code: "UPLOAD_HANDLER_UNEXPECTED",
				context: correlationId.length === 0 ? undefined : { correlationId },
				cause: error,
			});
		}
	};
};
