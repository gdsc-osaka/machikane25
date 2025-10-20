"use client";

import type { ResultAsync } from "neverthrow";
import { getFirebaseClients } from "@/firebase";
import { createRewardLedger } from "@/infra/reward/reward-ledger";
import { createRewardRepository } from "@/infra/reward/reward-repository";
import {
	createRedeemRewardService,
	type RedeemRewardFailure,
	type RedeemRewardInput,
	type RedeemRewardSuccess,
} from "./redeem-reward";

let service: ReturnType<typeof createRedeemRewardService> | null = null;

const resolveService = () => {
	if (service !== null) {
		return service;
	}
	const { firestore } = getFirebaseClients();
	service = createRedeemRewardService({
		rewards: createRewardRepository(firestore),
		ledger: createRewardLedger(firestore),
	});
	return service;
};

const redeemReward = (
	input: RedeemRewardInput,
): ResultAsync<RedeemRewardSuccess, RedeemRewardFailure> =>
	resolveService().redeem(input);

export { redeemReward };
