import type { Fish } from "../domain/fish/fish.js";
import { isExpired } from "../domain/fish/fish.js";
import { AppError } from "../errors/app-error.js";
import { UseCaseError } from "../errors/use-case-error.js";
import type { FishDTO, ListFishDeps, ListFishParams } from "./ports.js";

const toFishDto = (fish: Fish): FishDTO =>
	Object.freeze({
		id: fish.id,
		imageUrl: fish.imageUrl,
		color: fish.color,
	});

const logWithCorrelation =
	(logger: ListFishDeps["logger"], correlationId: string | undefined) =>
	(
		level: "info" | "warn" | "error",
		message: string,
		context?: Record<string, unknown>,
	) => {
		logger[level](message, {
			...(correlationId === undefined ? {} : { correlationId }),
			...(context ?? {}),
		});
	};

const filterExpired = (fish: readonly Fish[], ttlMinutes: number): Fish[] => {
	const now = new Date();
	return fish.filter(
		(item) =>
			!isExpired({
				fish: item,
				now,
				ttlMinutes,
			}),
	);
};

export const createListFish = (
	deps: ListFishDeps,
): ((params?: ListFishParams) => Promise<readonly FishDTO[]>) => {
	return async (params = {}) => {
		const correlationId = params.correlationId;
		const log = logWithCorrelation(deps.logger, correlationId);

		try {
			log("info", "listFish.repo.fetch.start");
			const fish = await deps.repo.list();
			log("info", "listFish.repo.fetch.success", {
				total: fish.length,
			});

			const activeFish = filterExpired(fish, deps.config.fishTtlMinutes);

			log("info", "listFish.filter.completed", {
				active: activeFish.length,
				removed: fish.length - activeFish.length,
			});

			const dtos = activeFish.map(toFishDto);
			log("info", "listFish.result.ready", {
				count: dtos.length,
			});

			return dtos;
		} catch (error) {
			if (error instanceof AppError) {
				log("error", "listFish.failed", {
					code: error.code,
					name: error.name,
				});
				throw error;
			}

			log("error", "listFish.unexpected", {
				name: error instanceof Error ? error.name : "UnknownError",
			});

			throw new UseCaseError({
				message: "Failed to list fish",
				code: "LIST_FISH_UNEXPECTED",
				context: correlationId === undefined ? undefined : { correlationId },
				cause: error,
			});
		}
	};
};
