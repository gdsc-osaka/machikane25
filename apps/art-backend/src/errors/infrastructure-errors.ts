import { AppError } from "./app-error.js";

export type RepositoryErrorParams = Readonly<{
	message: string;
	code: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}>;

export class RepositoryError extends AppError {
	constructor(params: RepositoryErrorParams) {
		super({
			message: params.message,
			code: params.code,
			name: "RepositoryError",
			context: params.context,
			cause: params.cause,
		});
	}
}

export type StorageErrorParams = Readonly<{
	message: string;
	code: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}>;

export class StorageError extends AppError {
	constructor(params: StorageErrorParams) {
		super({
			message: params.message,
			code: params.code,
			name: "StorageError",
			context: params.context,
			cause: params.cause,
		});
	}
}

export type ImageProcessingErrorParams = Readonly<{
	message: string;
	code: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}>;

export class ImageProcessingError extends AppError {
	constructor(params: ImageProcessingErrorParams) {
		super({
			message: params.message,
			code: params.code,
			name: "ImageProcessingError",
			context: params.context,
			cause: params.cause,
		});
	}
}
