"use client";

import { okAsync } from "neverthrow";
import {
	createRewardQrPayloadGenerator,
	createRewardRecord,
	createRewardSnapshot,
	type RewardQrEncodingError,
	type RewardRecord,
	type RewardRecordInvariantError,
	type RewardRepositoryError,
	type RewardSnapshot,
} from "@/domain/reward";
import { getFirebaseClients } from "@/firebase";
import { createRewardRepository } from "@/infra/reward/reward-repository";

type IssueRewardError =
	| RewardRepositoryError
	| RewardQrEncodingError
	| RewardRecordInvariantError;

const resolveRewardRepository = () => {
	const { firestore } = getFirebaseClients();
	return createRewardRepository(firestore);
};

const toSnapshot = (record: RewardRecord | null): RewardSnapshot =>
	createRewardSnapshot(record);

const loadSurveyReward = async (
	attendeeId: string,
): Promise<RewardSnapshot> => {
	const rewards = resolveRewardRepository();
	return rewards
		.findByAttendeeId(attendeeId)
		.map(toSnapshot)
		.match(
			(snapshot) => snapshot,
			(error) => {
				throw error;
			},
		);
};

const issueSurveyReward = async (
	attendeeId: string,
): Promise<RewardSnapshot> => {
	const rewards = resolveRewardRepository();
	const generateQrPayload = createRewardQrPayloadGenerator();
	return rewards
		.findByAttendeeId(attendeeId)
		.andThen((existing) => {
			if (existing !== null) {
				return okAsync(existing);
			}
			const issuedAt = Date.now();
			return generateQrPayload(attendeeId, issuedAt)
				.mapErr((error): IssueRewardError => error)
				.asyncAndThen((qrPayload) =>
					createRewardRecord({
						attendeeId,
						qrPayload,
						issuedAt,
						redeemedAt: null,
					})
						.mapErr((error): IssueRewardError => error)
						.asyncAndThen((rewardRecord) =>
							rewards
								.save(rewardRecord)
								.mapErr((error): IssueRewardError => error)
								.map(() => rewardRecord),
						),
				);
		})
		.map(toSnapshot)
		.match(
			(snapshot) => snapshot,
			(error) => {
				throw error;
			},
		);
};

export { issueSurveyReward, loadSurveyReward };
export type { RewardSnapshot };
