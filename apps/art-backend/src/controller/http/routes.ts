import type { Handler, Hono } from "hono";

import type { Logger } from "../../application/ports.js";
import type { Config } from "../../config/env.js";
import { createApiKeyMiddleware } from "../middleware/api-key.js";
import { createErrorHandler } from "../middleware/error-handler.js";
import type { ControllerEnv } from "../types.js";

export type RouteDeps = Readonly<{
	config: Config;
	logger: Logger;
	handlers: Readonly<{
		uploadPhoto: Handler<ControllerEnv>;
		getFish: Handler<ControllerEnv>;
	}>;
}>;

export const registerRoutes = (app: Hono<ControllerEnv>, deps: RouteDeps) => {
	app.onError(createErrorHandler({ logger: deps.logger }));
	app.use(
		"*",
		createApiKeyMiddleware({
			config: deps.config,
			logger: deps.logger,
		}),
	);

	app.post("/upload-photo", deps.handlers.uploadPhoto);
	app.get("/get-fish", deps.handlers.getFish);
};
