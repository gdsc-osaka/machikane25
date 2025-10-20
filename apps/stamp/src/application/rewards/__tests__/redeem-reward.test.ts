"use client";

import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import {
	type MarkRewardRedeemedInput,
	RewardAlreadyRedeemedError,
	RewardLedgerError,
	type RewardLedgerPort,
	RewardNotFoundError,
	type RewardRecord,
	type RewardRepository,
	RewardRepositoryError,
} from "@/domain/reward";
import { createRedeemRewardService } from "../redeem-reward";

const createRewardRecord = (
	overrides: Partial<RewardRecord> = {},
): RewardRecord => ({
	attendeeId: overrides.attendeeId ?? "guest-1",
	qrPayload: overrides.qrPayload ?? "qr-123",
	issuedAt: overrides.issuedAt ?? 1_700_000_000_000,
	redeemedAt: overrides.redeemedAt === undefined ? null : overrides.redeemedAt,
});

const createRepository = (
	initialRecords: ReadonlyArray<RewardRecord>,
): {
	repository: RewardRepository;
	store: Map<string, RewardRecord>;
} => {
	const store = new Map(
		initialRecords.map((record) => [record.attendeeId, record]),
	);
	const repository: RewardRepository = {
		findByAttendeeId(attendeeId) {
			return okAsync(store.get(attendeeId) ?? null);
		},
		save(record) {
			store.set(record.attendeeId, record);
			return okAsync(undefined);
		},
	};
	return { repository, store };
};

const createLedgerPort = (
	handler: (
		input: MarkRewardRedeemedInput,
	) => ReturnType<RewardLedgerPort["markRedeemed"]> = () => okAsync(undefined),
): {
	ledger: RewardLedgerPort;
	calls: Array<MarkRewardRedeemedInput>;
} => {
	const calls: Array<MarkRewardRedeemedInput> = [];
	const ledger: RewardLedgerPort = {
		markRedeemed(input) {
			calls.push(input);
			return handler(input);
		},
	};
	return { ledger, calls };
};

const createClock = (timestamp: number) => () => timestamp;

describe("redeem reward service", () => {
	it("persists redemption timestamp when reward is outstanding", async () => {
		const record = createRewardRecord({
			attendeeId: "guest-redeemable",
			redeemedAt: null,
		});
		const { repository, store } = createRepository([record]);
		const { ledger, calls } = createLedgerPort();
		const clock = createClock(1_700_000_500_000);
		const service = createRedeemRewardService({
			rewards: repository,
			ledger,
			clock,
		});

		const result = await service.redeem({
			attendeeId: "guest-redeemable",
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();
		expect(payload).toEqual({
			status: "redeemed",
			attendeeId: "guest-redeemable",
			redeemedAt: 1_700_000_500_000,
		});
		const persisted = store.get("guest-redeemable");
		expect(persisted?.redeemedAt).toBe(1_700_000_500_000);
		expect(calls).toEqual([
			{
				attendeeId: "guest-redeemable",
				redeemedAt: 1_700_000_500_000,
			},
		]);
	});

	it("rejects duplicate redemption attempts", async () => {
		const record = createRewardRecord({
			attendeeId: "guest-duplicate",
			redeemedAt: 1_700_000_400_000,
		});
		const { repository } = createRepository([record]);
		const { ledger, calls } = createLedgerPort();
		const service = createRedeemRewardService({
			rewards: repository,
			ledger,
		});

		const result = await service.redeem({
			attendeeId: "guest-duplicate",
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardAlreadyRedeemedError.isFn(error)).toBe(true);
		expect(error.extra !== undefined && "redeemedAt" in error.extra).toBe(true);
		if (error.extra !== undefined && "redeemedAt" in error.extra) {
			expect(error.extra?.redeemedAt).toBe(1_700_000_400_000);
		}
		expect(calls).toHaveLength(0);
	});

	it("returns descriptive error when reward record is missing", async () => {
		const { repository } = createRepository([]);
		const { ledger } = createLedgerPort();
		const service = createRedeemRewardService({
			rewards: repository,
			ledger,
		});

		const result = await service.redeem({
			attendeeId: "unknown-guest",
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardNotFoundError.isFn(error)).toBe(true);
		expect(error.extra !== undefined && "attendeeId" in error.extra).toBe(true);
		if (error.extra !== undefined && "attendeeId" in error.extra) {
			expect(error.extra?.attendeeId).toBe("unknown-guest");
		}
	});

	it("propagates ledger failures", async () => {
		const record = createRewardRecord({
			attendeeId: "guest-ledger-failure",
		});
		const { repository } = createRepository([record]);
		const { ledger } = createLedgerPort(() =>
			errAsync(
				RewardLedgerError("Ledger write failed.", {
					extra: { operation: "markRedeemed" },
				}),
			),
		);
		const service = createRedeemRewardService({
			rewards: repository,
			ledger,
		});

		const result = await service.redeem({
			attendeeId: "guest-ledger-failure",
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardLedgerError.isFn(error)).toBe(true);
	});

	it("propagates repository persistence failures", async () => {
		const record = createRewardRecord({
			attendeeId: "guest-repo-failure",
		});
		const repository: RewardRepository = {
			findByAttendeeId(attendeeId) {
				return attendeeId === "guest-repo-failure"
					? okAsync(record)
					: okAsync(null);
			},
			save() {
				return errAsync(
					RewardRepositoryError("Unexpected repository error.", {
						extra: { operation: "save" },
					}),
				);
			},
		};
		const { ledger } = createLedgerPort();
		const service = createRedeemRewardService({
			rewards: repository,
			ledger,
		});

		const result = await service.redeem({
			attendeeId: "guest-repo-failure",
		});

		expect(result.isErr()).toBe(true);
	});
});
