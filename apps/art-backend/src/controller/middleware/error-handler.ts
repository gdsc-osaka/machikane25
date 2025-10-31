import type { ErrorHandler } from "hono";

import type { Logger } from "../../application/ports.js";
import { AppError } from "../../errors/app-error.js";
import { mapErrorToHttp } from "../../errors/http-error-map.js";
import { UseCaseError } from "../../errors/use-case-error.js";
import type { ControllerEnv } from "../types.js";
import { getCorrelationId } from "../types.js";

type ErrorHandlerDeps = Readonly<{
	logger: Logger;
}>;

const buildUnknownError = (error: unknown) => {
	if (error instanceof Error) {
		return new UseCaseError({
			message: error.message,
			code: "INTERNAL_UNEXPECTED",
			cause: error,
		});
	}

	return new UseCaseError({
		message: "Unknown error",
		code: "INTERNAL_UNEXPECTED",
		cause: error,
	});
};

export const createErrorHandler = (
	deps: ErrorHandlerDeps,
): ErrorHandler<ControllerEnv> => {
	return (error, c) => {
		const normalized =
			error instanceof AppError ? error : buildUnknownError(error);
		const metadata = mapErrorToHttp(normalized);
		const correlationId = getCorrelationId(c);

		const logContext = Object.freeze({
			code: normalized.code,
			name: normalized.name,
			correlationId,
			method: c.req.method,
			path: c.req.path,
			severity: metadata.severity,
			...normalized.context,
		});

		deps.logger[metadata.severity](normalized.message, logContext);

		const response = c.json(
			{
				error: normalized.code,
				message: normalized.message,
			},
			metadata.status,
		);

		return response;
	};
};
