import { randomUUID } from "node:crypto";
import type { Handler } from "hono";

import type { FishDTO, Logger } from "../../application/ports.js";
import { AppError } from "../../errors/app-error.js";
import { UseCaseError } from "../../errors/use-case-error.js";
import type { ControllerEnv } from "../types.js";
import { getCorrelationId } from "../types.js";

export type GetFishHandlerDeps = Readonly<{
	listFish: (
		params: Readonly<{ correlationId?: string }>,
	) => Promise<readonly FishDTO[]>;
	logger: Logger;
}>;

const logWithCorrelation = (logger: Logger, correlationId: string) => {
	return (
		level: "info" | "warn" | "error",
		message: string,
		context?: Record<string, unknown>,
	) => {
		logger[level](message, {
			correlationId,
			...(context ?? {}),
		});
	};
};

export const createGetFishHandler = (
	deps: GetFishHandlerDeps,
): Handler<ControllerEnv> => {
	return async (c) => {
		const correlationId = getCorrelationId(c) ?? randomUUID();
		const log = logWithCorrelation(deps.logger, correlationId);

		try {
			log("info", "getFish.useCase.start");
			const fish = await deps.listFish({ correlationId });
			log("info", "getFish.useCase.success", { count: fish.length });

			const response = c.json(fish);
			response.headers.set("Cache-Control", "no-store");
			return response;
		} catch (error) {
			if (error instanceof AppError) {
				log("error", "getFish.useCase.failed", {
					code: error.code,
					name: error.name,
				});
				throw error;
			}

			log("error", "getFish.unexpected", {
				name: error instanceof Error ? error.name : "UnknownError",
			});

			throw new UseCaseError({
				message: "Get fish handler failed",
				code: "GET_FISH_HANDLER_UNEXPECTED",
				context: { correlationId },
				cause: error,
			});
		}
	};
};
