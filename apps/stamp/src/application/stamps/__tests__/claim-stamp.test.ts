import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { createClaimStampService } from "@/application/stamps/claim-stamp";
import type { StampRepository } from "@/domain/stamp";
import {
	type createEmptyLedger,
	DuplicateStampError,
	STAMP_SEQUENCE,
	type StampCheckpoint,
} from "@/domain/stamp";

type InMemoryDocument = {
	createdAt: number;
	lastCollectedAt: number | null;
	ledger: ReturnType<typeof createEmptyLedger>;
};

const createInMemoryRepository = (): StampRepository & {
	store: Map<string, InMemoryDocument>;
} => {
	const store = new Map<string, InMemoryDocument>();

	return {
		store,
		getByUserId(userId) {
			const entry = store.get(userId);
			return okAsync(
				entry
					? {
							...entry,
							userId,
							ledger: { ...entry.ledger },
						}
					: null,
			);
		},
		save({ userId, ledger, collectedAt, createdAt, lastCollectedAt }) {
			const existing = store.get(userId);
			const resolvedCreatedAt =
				createdAt ?? existing?.createdAt ?? collectedAt ?? Date.now();
			const resolvedLastCollectedAt =
				lastCollectedAt ?? collectedAt ?? existing?.lastCollectedAt ?? null;

			store.set(userId, {
				createdAt: resolvedCreatedAt,
				lastCollectedAt: resolvedLastCollectedAt,
				ledger: { ...ledger },
			});

			return okAsync(undefined);
		},
	};
};

const createClock = (epoch = 1_700_000_000_000) => {
	const state = { current: epoch };
	return () => {
		const next = state.current + 1_000;
		state.current = next;
		return next;
	};
};

describe("claim stamp integration", () => {
	it("collects successive checkpoints and persists progress", async () => {
		const repository = createInMemoryRepository();
		const service = createClaimStampService({
			repository,
			clock: createClock(),
		});

		const checkpoints = STAMP_SEQUENCE.slice(0, 4);
		const results = await checkpoints.reduce(async (promise, checkpoint) => {
			const acc = await promise;
			const token = `token-${checkpoint}`;
			const result = await service.claim({
				token,
				userId: "guest-1",
			});
			return [...acc, { checkpoint, result }];
		}, Promise.resolve<Array<{ checkpoint: StampCheckpoint; result: unknown }>>(
			[],
		));

		results.forEach(({ checkpoint, result }, index) => {
			expect(result).toHaveProperty("isOk");
			const claimResult = result as {
				isOk: () => boolean;
				_unsafeUnwrap: () => {
					checkpoint: StampCheckpoint;
					progress: {
						collected: ReadonlyArray<StampCheckpoint>;
						remaining: ReadonlyArray<StampCheckpoint>;
						lastCollectedAt: number | null;
						isComplete: boolean;
					};
				};
			};

			expect(claimResult.isOk()).toBe(true);
			const payload = claimResult._unsafeUnwrap();
			expect(payload.checkpoint).toBe(checkpoint);
			expect(payload.progress.collected).toContain(checkpoint);
			expect(payload.progress.collected).toHaveLength(index + 1);
			expect(payload.progress.remaining).toEqual(
				STAMP_SEQUENCE.filter(
					(candidate) => !payload.progress.collected.includes(candidate),
				),
			);
			expect(payload.progress.isComplete).toBe(false);
			expect(payload.progress.lastCollectedAt).not.toBeNull();
		});

		const persisted = repository.store.get("guest-1");
		expect(persisted).not.toBeUndefined();
		checkpoints.forEach((checkpoint) => {
			expect(persisted?.ledger[checkpoint]).not.toBeNull();
		});
	});

	it("rejects duplicate tokens for the same attendee", async () => {
		const repository = createInMemoryRepository();
		const service = createClaimStampService({
			repository,
			clock: createClock(),
		});

		const first = await service.claim({
			token: "token-reception",
			userId: "guest-2",
		});
		expect(first).toHaveProperty("isOk");
		const firstResult = first as {
			isOk: () => boolean;
			_unsafeUnwrap: () => {
				progress: {
					collected: ReadonlyArray<StampCheckpoint>;
				};
			};
		};
		expect(firstResult.isOk()).toBe(true);

		const duplicate = await service.claim({
			token: "token-reception",
			userId: "guest-2",
		});

		expect(duplicate).toHaveProperty("isErr");
		const duplicateResult = duplicate as {
			isErr: () => boolean;
			_unsafeUnwrapErr: () => unknown;
		};
		expect(duplicateResult.isErr()).toBe(true);
		const duplicateError = duplicateResult._unsafeUnwrapErr();
		expect(DuplicateStampError.isFn(duplicateError)).toBe(true);

		const persisted = repository.store.get("guest-2");
		const collected = firstResult._unsafeUnwrap().progress.collected;
		collected.forEach((checkpoint) => {
			expect(persisted?.ledger[checkpoint]).not.toBeNull();
		});
	});
});
