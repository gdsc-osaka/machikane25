import { err, ok, type Result } from "neverthrow";
import { createValidationError, type ValidationError } from "./errors";

export type Photo = Readonly<{
	buffer: Buffer;
	mimeType: string;
	size: number;
}>;

export type PhotoMeta = Readonly<{
	mimeType: string;
	size: number;
}>;

export type PhotoLimits = Readonly<{
	maxSizeBytes: number;
}>;

const SUPPORTED_MIME_TYPES = Object.freeze([
	"image/jpeg",
	"image/png",
	"image/webp",
] as const);

const normaliseMimeType = (mimeType: string) => mimeType.toLowerCase();

const isSupportedMimeType = (mimeType: string) =>
	SUPPORTED_MIME_TYPES.some((supported) => supported === mimeType);

export const validatePhotoMeta = (
	buffer: Buffer,
	meta: PhotoMeta,
	limits: PhotoLimits,
): Result<PhotoMeta, ValidationError> => {
	if (!Buffer.isBuffer(buffer)) {
		return err(createValidationError("photo buffer must be a Node.js Buffer"));
	}

	if (!Number.isFinite(limits.maxSizeBytes) || limits.maxSizeBytes <= 0) {
		return err(
			createValidationError("photo limits must include a positive max size"),
		);
	}

	if (meta.size !== buffer.byteLength) {
		return err(
			createValidationError("photo size mismatch between buffer and metadata"),
		);
	}

	if (meta.size > limits.maxSizeBytes) {
		return err(
			createValidationError(
				`photo size exceeds limit of ${limits.maxSizeBytes} bytes`,
			),
		);
	}

	const mimeType = normaliseMimeType(meta.mimeType);

	if (!isSupportedMimeType(mimeType)) {
		return err(
			createValidationError(
				`mime type "${meta.mimeType}" is not supported for photo uploads`,
			),
		);
	}

	return ok(
		Object.freeze({
			mimeType,
			size: meta.size,
		}),
	);
};

export const createPhoto = (
	buffer: Buffer,
	meta: PhotoMeta,
	limits: PhotoLimits,
): Result<Photo, ValidationError> =>
	validatePhotoMeta(buffer, meta, limits).map((validatedMeta) =>
		Object.freeze({
			buffer,
			mimeType: validatedMeta.mimeType,
			size: validatedMeta.size,
		}),
	);

export const photoLimits = (maxSizeBytes: number): PhotoLimits =>
	Object.freeze({ maxSizeBytes });

export const supportedPhotoMimeTypes = SUPPORTED_MIME_TYPES;
