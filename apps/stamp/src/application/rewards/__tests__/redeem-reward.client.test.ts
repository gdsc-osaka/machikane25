import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RewardLedgerPort, RewardRepository } from "@/domain/reward";
import type { RedeemRewardSuccess } from "../redeem-reward";

const getFirebaseClientsMock = vi.hoisted(() =>
	vi.fn(() => ({
		firestore: { projectId: "test-project" },
	})),
);

const createRewardRepositoryMock = vi.hoisted(() => vi.fn());
const createRewardLedgerMock = vi.hoisted(() => vi.fn());
const redeemServiceRedeemMock = vi.hoisted(() => vi.fn());
const createRedeemRewardServiceMock = vi.hoisted(() => vi.fn());

vi.mock("@/firebase", () => ({
	getFirebaseClients: getFirebaseClientsMock,
}));

vi.mock("@/infra/reward/reward-repository", () => ({
	createRewardRepository: createRewardRepositoryMock,
}));

vi.mock("@/infra/reward/reward-ledger", () => ({
	createRewardLedger: createRewardLedgerMock,
}));

vi.mock("../redeem-reward", () => ({
	createRedeemRewardService: createRedeemRewardServiceMock,
}));

const importClientModule = async () => {
	const module = await import("../redeem-reward.client");
	return module;
};

describe("redeemReward (client)", () => {
	beforeEach(() => {
		vi.resetModules();
		getFirebaseClientsMock.mockReset();
		createRewardRepositoryMock.mockReset();
		createRewardLedgerMock.mockReset();
		createRedeemRewardServiceMock.mockReset();
		redeemServiceRedeemMock.mockReset();
	});

	it("creates the redeem service with Firestore dependencies and forwards the call", async () => {
		const firestore = { projectId: "demo" };
		const rewardRepository: RewardRepository = {
			findByAttendeeId: vi.fn(),
			save: vi.fn(),
		};
		const rewardLedger: RewardLedgerPort = {
			markRedeemed: vi.fn(),
		};
		const input = { attendeeId: "guest-1" };
		const redeemSuccess: RedeemRewardSuccess = {
			status: "redeemed",
			attendeeId: input.attendeeId,
			redeemedAt: Date.now(),
		};
		const redeemResult = okAsync(redeemSuccess);

		getFirebaseClientsMock.mockReturnValue({ firestore });
		createRewardRepositoryMock.mockReturnValue(rewardRepository);
		createRewardLedgerMock.mockReturnValue(rewardLedger);
		redeemServiceRedeemMock.mockReturnValue(redeemResult);
		createRedeemRewardServiceMock.mockReturnValue({
			redeem: redeemServiceRedeemMock,
		});

		const { redeemReward } = await importClientModule();

		const result = redeemReward(input);

		expect(getFirebaseClientsMock).toHaveBeenCalledTimes(1);
		expect(createRewardRepositoryMock).toHaveBeenCalledWith(firestore);
		expect(createRewardLedgerMock).toHaveBeenCalledWith(firestore);
		expect(createRedeemRewardServiceMock).toHaveBeenCalledWith({
			rewards: rewardRepository,
			ledger: rewardLedger,
		});
		expect(redeemServiceRedeemMock).toHaveBeenCalledWith(input);
		expect(result).toBe(redeemResult);
	});

	it("memoizes the redeem service instance across invocations", async () => {
		const firestore = { projectId: "memo" };
		const rewardRepository: RewardRepository = {
			findByAttendeeId: vi.fn(),
			save: vi.fn(),
		};
		const rewardLedger: RewardLedgerPort = {
			markRedeemed: vi.fn(),
		};
		const firstInput = { attendeeId: "guest-alpha" };
		const secondInput = { attendeeId: "guest-beta" };
		const redeemSuccess: RedeemRewardSuccess = {
			status: "redeemed",
			attendeeId: firstInput.attendeeId,
			redeemedAt: Date.now(),
		};
		const redeemResult = okAsync(redeemSuccess);

		getFirebaseClientsMock.mockReturnValue({ firestore });
		createRewardRepositoryMock.mockReturnValue(rewardRepository);
		createRewardLedgerMock.mockReturnValue(rewardLedger);
		redeemServiceRedeemMock.mockReturnValue(redeemResult);
		createRedeemRewardServiceMock.mockReturnValue({
			redeem: redeemServiceRedeemMock,
		});

		const { redeemReward } = await importClientModule();

		redeemReward(firstInput);
		redeemReward(secondInput);

		expect(getFirebaseClientsMock).toHaveBeenCalledTimes(1);
		expect(createRewardRepositoryMock).toHaveBeenCalledTimes(1);
		expect(createRewardLedgerMock).toHaveBeenCalledTimes(1);
		expect(createRedeemRewardServiceMock).toHaveBeenCalledTimes(1);
		expect(redeemServiceRedeemMock).toHaveBeenCalledTimes(2);
		expect(redeemServiceRedeemMock).toHaveBeenNthCalledWith(1, firstInput);
		expect(redeemServiceRedeemMock).toHaveBeenNthCalledWith(2, secondInput);
	});
});
