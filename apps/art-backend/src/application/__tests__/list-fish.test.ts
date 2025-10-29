import { describe, expect, test, vi } from "vitest";

import type { Config } from "../../config/env.js";
import { createFish } from "../../domain/fish/fish.js";
import { AppError } from "../../errors/app-error.js";
import { UseCaseError } from "../../errors/use-case-error.js";
import { createListFish } from "../list-fish.js";
import type { ListFishDeps } from "../ports.js";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
	apiKey: "test-key",
	firebaseProjectId: "project",
	credentialsPath: "/tmp/creds.json",
	fishTtlMinutes: 10,
	maxPhotoSizeMb: 5,
	...overrides,
});

const createLogger = () =>
	Object.freeze({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	});

const createRepo = () =>
	Object.freeze({
		save: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
	});

describe("createListFish", () => {
	test("filters expired fish based on TTL configuration", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-01T00:20:00.000Z"));
		try {
			const freshFish = createFish({
				id: "fresh-1",
				imageUrl: "https://storage/fresh.png",
				imagePath: "fish_images/fresh.png",
				color: "#AABBCC",
				createdAt: new Date("2024-01-01T00:15:00.000Z"),
			});
			const staleFish = createFish({
				id: "stale-1",
				imageUrl: "https://storage/stale.png",
				imagePath: "fish_images/stale.png",
				color: "#DDEEFF",
				createdAt: new Date("2024-01-01T00:09:59.000Z"),
			});

			const repo = createRepo();
			repo.list.mockResolvedValue([freshFish, staleFish]);
			const deps: ListFishDeps = {
				repo,
				config: createConfig({ fishTtlMinutes: 10 }),
				logger: createLogger(),
			};
			const listFish = createListFish(deps);

			const result = await listFish({ correlationId: "corr-list" });

			expect(result).toEqual([
				{
					id: freshFish.id,
					imageUrl: freshFish.imageUrl,
					color: freshFish.color,
				},
			]);
			expect(repo.list).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	test("rethrows AppError instances from repository", async () => {
		const repo = createRepo();
		const repoError = new AppError({
			message: "list failed",
			code: "REPOSITORY_FAILURE",
		});
		repo.list.mockRejectedValue(repoError);
		const deps: ListFishDeps = {
			repo,
			config: createConfig(),
			logger: createLogger(),
		};
		const listFish = createListFish(deps);

		await expect(listFish()).rejects.toThrow(repoError);
	});

	test("wraps unexpected failures in UseCaseError", async () => {
		const repo = createRepo();
		repo.list.mockRejectedValue(new Error("boom"));
		const deps: ListFishDeps = {
			repo,
			config: createConfig(),
			logger: createLogger(),
		};
		const listFish = createListFish(deps);

		await expect(listFish({ correlationId: "corr" })).rejects.toThrow(
			UseCaseError,
		);
	});
});
