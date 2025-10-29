import { AppError } from "../../errors/app-error.js";

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

type PhotoValidationContext = Readonly<{
	code: "PHOTO_TOO_LARGE" | "PHOTO_UNSUPPORTED_TYPE" | "PHOTO_SIZE_MISMATCH";
	details?: Record<string, unknown>;
}>;

export class PhotoValidationError extends AppError {
	constructor(context: PhotoValidationContext) {
		super({
			message: "Photo validation failed",
			code: context.code,
			name: "PhotoValidationError",
			context: context.details ?? {},
		});
	}
}

const SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const normalizeMimeType = (mimeType: string) => mimeType.toLowerCase();

const assertSupportedMimeType = (mimeType: string) => {
	if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
		throw new PhotoValidationError({
			code: "PHOTO_UNSUPPORTED_TYPE",
			details: { mimeType },
		});
	}
};

const assertSizeWithinLimit = (size: number, limits: PhotoLimits) => {
	if (size > limits.maxSizeBytes) {
		throw new PhotoValidationError({
			code: "PHOTO_TOO_LARGE",
			details: { size, maxSizeBytes: limits.maxSizeBytes },
		});
	}
};

const assertBufferMatchesSize = (buffer: Buffer, size: number) => {
	if (buffer.byteLength !== size) {
		throw new PhotoValidationError({
			code: "PHOTO_SIZE_MISMATCH",
			details: { bufferBytes: buffer.byteLength, declaredSize: size },
		});
	}
};

type ValidatePhotoParams = Readonly<{
	buffer: Buffer;
	meta: PhotoMeta;
	limits: PhotoLimits;
}>;

export const validatePhoto = (params: ValidatePhotoParams) => {
	const mimeType = normalizeMimeType(params.meta.mimeType);
	assertSupportedMimeType(mimeType);
	assertSizeWithinLimit(params.meta.size, params.limits);
	assertBufferMatchesSize(params.buffer, params.meta.size);
};

/**
 * The provided buffer must contain a privacy-safe (blurred) rendition
 * of the attendee photo before persistence.
 */
export const createPhoto = (
	buffer: Buffer,
	meta: PhotoMeta,
	limits: PhotoLimits,
): Photo => {
	validatePhoto({ buffer, meta, limits });
	const photo: Photo = {
		buffer,
		mimeType: normalizeMimeType(meta.mimeType),
		size: meta.size,
	};
	return Object.freeze(photo);
};
