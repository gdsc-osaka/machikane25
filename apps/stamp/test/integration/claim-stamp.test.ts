import { describe, expect, it } from "vitest";
import { createClaimStampService } from "@/application/stamps/claim-stamp";
import {
	type createEmptyLedger,
	STAMP_SEQUENCE,
	type StampCheckpoint,
} from "@/domain/stamp";
import type { StampRepository } from "@/infra/stamp/stamp-repository";

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
		async getByUserId(userId) {
			const entry = store.get(userId);
			return entry
				? {
						...entry,
						ledger: { ...entry.ledger },
					}
				: null;
		},
		async save({ userId, ledger, collectedAt }) {
			const existing = store.get(userId);
			const createdAt = existing?.createdAt ?? collectedAt ?? Date.now();
			const lastCollectedAt = collectedAt ?? existing?.lastCollectedAt ?? null;

			store.set(userId, {
				createdAt,
				lastCollectedAt,
				ledger,
			});
		},
	};
};

const TOKEN_PAIRS: ReadonlyArray<readonly [string, StampCheckpoint]> = [
	["token-reception", "reception"],
	["token-photobooth", "photobooth"],
	["token-art", "art"],
	["token-robot", "robot"],
	["token-survey", "survey"],
];

const resolveCheckpointFromToken = (token: string): StampCheckpoint | null =>
	TOKEN_PAIRS.find(([candidate]) => candidate === token)?.[1] ?? null;

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
			resolveCheckpoint: resolveCheckpointFromToken,
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
			resolveCheckpoint: resolveCheckpointFromToken,
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
			_unsafeUnwrapErr: () => { code: string };
		};
		expect(duplicateResult.isErr()).toBe(true);
		expect(duplicateResult._unsafeUnwrapErr().code).toBe("duplicate-stamp");

		const persisted = repository.store.get("guest-2");
		const collected = firstResult._unsafeUnwrap().progress.collected;
		collected.forEach((checkpoint) => {
			expect(persisted?.ledger[checkpoint]).not.toBeNull();
		});
	});
});
