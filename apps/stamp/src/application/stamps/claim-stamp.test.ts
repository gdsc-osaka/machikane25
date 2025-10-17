import { describe, expect, test, vi } from "vitest";
import { createClaimStampService } from "./claim-stamp";
import { createEmptyLedger } from "@/domain/stamp";
import type { StampRepository } from "@/infra/firestore/stamp-repository";

const noopClock = () => 1_700_000_000_000;

const createRepository = (
	overrides: Partial<StampRepository> = {},
): StampRepository => ({
	getByUserId: vi.fn().mockResolvedValue(null),
	save: vi.fn().mockResolvedValue(undefined),
	...overrides,
});

const resolveCheckpoint = (token: string) =>
	({
		"token-reception": "reception",
		"token-robot": "robot",
	}[token] ?? null);

describe("claim stamp application service", () => {
	test("claims a checkpoint and persists updated ledger", async () => {
		const repository = createRepository();
		const service = createClaimStampService({
			repository,
			resolveCheckpoint,
			clock: noopClock,
		});

		const result = await service.claim({
			token: "token-reception",
			userId: "guest-1",
		});

		expect(result.isOk()).toBe(true);
		expect(repository.save).toHaveBeenCalledWith({
			userId: "guest-1",
			ledger: expect.objectContaining({ reception: noopClock() }),
			collectedAt: noopClock(),
		});
	});

	test("returns duplicate error when checkpoint already collected", async () => {
		const ledger = createEmptyLedger();
		ledger.robot = noopClock();

		const repository = createRepository({
			getByUserId: vi.fn().mockResolvedValue({
				ledger,
				createdAt: 1,
				lastCollectedAt: noopClock(),
			}),
		});

		const service = createClaimStampService({
			repository,
			resolveCheckpoint,
			clock: () => noopClock() + 10,
		});

		const result = await service.claim({
			token: "token-robot",
			userId: "guest-2",
		});

		expect(result.isErr()).toBe(true);
		expect(repository.save).not.toHaveBeenCalled();
		expect(result._unsafeUnwrapErr().reason).toBe("duplicate");
	});

	test("returns invalid-token error when token cannot be resolved", async () => {
		const repository = createRepository();
		const service = createClaimStampService({
			repository,
			resolveCheckpoint,
			clock: noopClock,
		});

		const result = await service.claim({
			token: "unknown-token",
			userId: "guest-3",
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().reason).toBe("invalid-token");
		expect(repository.save).not.toHaveBeenCalled();
	});
});
