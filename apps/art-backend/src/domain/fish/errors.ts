export type ValidationError = Readonly<{
	type: "validation";
	message: string;
	context?: Readonly<Record<string, unknown>>;
}>;

export const createValidationError = (
	message: string,
	context?: Record<string, unknown>,
): ValidationError =>
	Object.freeze({
		type: "validation",
		message,
		context: context ? Object.freeze({ ...context }) : undefined,
	});

export type ColorExtractionError = Readonly<{
	type: "color-extraction";
	message: string;
	cause?: unknown;
}>;

export const createColorExtractionError = (
	message: string,
	cause?: unknown,
): ColorExtractionError =>
	Object.freeze({
		type: "color-extraction",
		message,
		...(cause !== undefined ? { cause } : {}),
	});
