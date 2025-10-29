import { AppError } from "./app-error.js";

export type UseCaseErrorParams = Readonly<{
	message: string;
	code: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}>;

export class UseCaseError extends AppError {
	constructor(params: UseCaseErrorParams) {
		super({
			message: params.message,
			code: params.code,
			name: "UseCaseError",
			context: params.context,
			cause: params.cause,
		});
	}
}
