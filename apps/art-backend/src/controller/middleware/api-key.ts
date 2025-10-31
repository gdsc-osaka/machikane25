import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";

import type { Logger } from "../../application/ports.js";
import type { Config } from "../../config/env.js";
import { AuthenticationError } from "../../errors/authentication-error.js";
import type { ControllerEnv } from "../types.js";
import { setCorrelationId } from "../types.js";

const headerName = "x-api-key";

const sanitize = (value: string | undefined) => {
	if (value === undefined) {
		return "";
	}
	return value.trim();
};

const logFailure = (
	logger: Logger,
	correlationId: string,
	reason: "missing" | "mismatch",
) => {
	logger.warn("auth.failed", {
		correlationId,
		reason,
	});
};

export const createApiKeyMiddleware = (
	deps: Readonly<{ config: Config; logger: Logger }>,
): MiddlewareHandler<ControllerEnv> => {
	return async (c, next) => {
		const correlationId = randomUUID();
		setCorrelationId(c, correlationId);

		const headerValue = sanitize(c.req.header(headerName));
		if (headerValue.length === 0) {
			logFailure(deps.logger, correlationId, "missing");
			throw new AuthenticationError({ reason: "missing" });
		}

		if (headerValue !== deps.config.apiKey) {
			logFailure(deps.logger, correlationId, "mismatch");
			throw new AuthenticationError({ reason: "mismatch" });
		}

		deps.logger.info("auth.success", { correlationId });

		await next();
	};
};
