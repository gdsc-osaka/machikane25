import { describe, expect, test } from "vitest";
import { createClaimStampService } from "@/application/stamps/claim-stamp";
import { createEmptyLedger, STAMP_ORDER } from "@/domain/stamp";
import type { StampRepository } from "@/infra/firestore/stamp-repository";

type InMemoryDocument = {
	ledger: ReturnType<typeof createEmptyLedger>;
	createdAt: number;
	lastCollectedAt: number | null;
};

const createInMemoryRepository = (): StampRepository & {
	store: Map<string, InMemoryDocument>;
} => {
	const store = new Map<string, InMemoryDocument>();

	return {
		store,
		async getByUserId(userId) {
			const document = store.get(userId);
			return document ? { ...document } : null;
		},
		async save({ userId, ledger, collectedAt }) {
			const existing = store.get(userId);
			if (existing) {
				store.set(userId, {
					ledger,
					createdAt: existing.createdAt,
					lastCollectedAt: collectedAt ?? existing.lastCollectedAt,
				});
				return;
			}
			store.set(userId, {
				ledger,
				createdAt: collectedAt ?? Date.now(),
				lastCollectedAt: collectedAt ?? null,
			});
		},
	};
};

const resolveCheckpoint = (token: string) =>
	(({
		"token-reception": "reception",
		"token-photobooth": "photobooth",
		"token-art": "art",
		"token-robot": "robot",
		"token-survey": "survey",
	} as const)[token] ?? null);

const createClock = () => {
	let now = 1_700_000_000_000;
	return () => {
		now += 1_000;
		return now;
	};
};

describe("claim stamp integration", () => {
	test("collects successive checkpoints and persists progress", async () => {
		const repository = createInMemoryRepository();
		const clock = createClock();
		const service = createClaimStampService({
			repository,
			resolveCheckpoint,
			clock,
		});

		for (const checkpoint of STAMP_ORDER.slice(0, 4)) {
			const token = `token-${checkpoint}`;
			const result = await service.claim({
				token,
				userId: "guest-1",
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().progress.collected).toContain(checkpoint);
		}

		const persisted = repository.store.get("guest-1");
		expect(persisted?.ledger).not.toBeUndefined();
		expect(persisted?.ledger.robot).not.toBeNull();
	});

	test("does not overwrite ledger when duplicate token submitted", async () => {
		const repository = createInMemoryRepository();
		const clock = createClock();
		const service = createClaimStampService({
			repository,
			resolveCheckpoint,
			clock,
		});

		await service.claim({
			token: "token-reception",
			userId: "guest-2",
		});
		const firstPersisted = repository.store.get("guest-2");

		const duplicate = await service.claim({
			token: "token-reception",
			userId: "guest-2",
		});

		expect(duplicate.isErr()).toBe(true);
		const persisted = repository.store.get("guest-2");
		expect(persisted?.ledger.reception).toBe(firstPersisted?.ledger.reception);
	});
});
