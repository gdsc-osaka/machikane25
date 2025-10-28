import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { buildConfig } from "./config/env.js";
import { getFirebaseServices } from "./config/firebase.js";
import { createLogger } from "./infra/logging/cloud-logger.js";

export const config = buildConfig();
export const firebaseServices = getFirebaseServices(config);
export const logger = createLogger({ config });

const app = new Hono();

app.get("/", (c) => {
	logger.info("healthcheck", { path: "/" });
	return c.text("Hello Hono!");
});

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		logger.info("server-started", { port: info.port });
	},
);
