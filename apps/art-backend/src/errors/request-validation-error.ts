import { AppError } from "./app-error.js";

export type RequestValidationErrorParams = Readonly<{
	message: string;
	code?: string;
	details?: Record<string, unknown>;
}>;

const DEFAULT_CODE = "REQUEST_INVALID";

export class RequestValidationError extends AppError {
	constructor(params: RequestValidationErrorParams) {
		super({
			message: params.message,
			code: params.code ?? DEFAULT_CODE,
			name: "RequestValidationError",
			context: params.details,
		});
	}
}
