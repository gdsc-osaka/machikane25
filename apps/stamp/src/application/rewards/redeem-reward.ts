import { errAsync, okAsync, Result, type ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";
import {
	markRewardRedeemed,
	type RewardAlreadyRedeemedError,
	type RewardLedgerError,
	type RewardLedgerPort,
	RewardNotFoundError,
	type RewardRecordInvariantError,
	type RewardRepository,
	type RewardRepositoryError,
} from "@/domain/reward";

type RedeemRewardInput = {
	attendeeId: string;
};

type RedeemRewardSuccess = {
	status: "redeemed";
	attendeeId: string;
	redeemedAt: number;
};

type RedeemRewardService = {
	redeem: (
		input: RedeemRewardInput,
	) => ResultAsync<RedeemRewardSuccess, RedeemRewardFailure>;
};

type RedeemRewardDependencies = {
	rewards: RewardRepository;
	ledger: RewardLedgerPort;
	clock?: () => number;
};

const redeemRewardInputSchema = z.object({
	attendeeId: z.string().min(1),
});

const RedeemRewardValidationError = errorBuilder("RedeemRewardValidationError");

type RedeemRewardValidationError = InferError<
	typeof RedeemRewardValidationError
>;

type RedeemRewardFailure =
	| RedeemRewardValidationError
	| RewardNotFoundError
	| RewardAlreadyRedeemedError
	| RewardRepositoryError
	| RewardRecordInvariantError
	| RewardLedgerError;

const mapValidationError = (cause: unknown): RedeemRewardValidationError =>
	RedeemRewardValidationError("Reward redemption input failed validation.", {
		cause,
	});

const createRedeemRewardService = ({
	rewards,
	ledger,
	clock = Date.now,
}: RedeemRewardDependencies): RedeemRewardService => {
	const redeem = (
		rawInput: RedeemRewardInput,
	): ResultAsync<RedeemRewardSuccess, RedeemRewardFailure> =>
		Result.fromThrowable(
			() => redeemRewardInputSchema.parse(rawInput),
			mapValidationError,
		)().asyncAndThen(({ attendeeId }) =>
			rewards
				.findByAttendeeId(attendeeId)
				.mapErr((error): RedeemRewardFailure => error)
				.andThen((record) =>
					record === null
						? errAsync(
								RewardNotFoundError("Reward record not found.", {
									extra: { attendeeId },
								}),
							).mapErr((error): RedeemRewardFailure => error)
						: okAsync(record),
				)
				.andThen((record) => {
					const redeemedAt = clock();
					return markRewardRedeemed(record, redeemedAt)
						.mapErr((error): RedeemRewardFailure => error)
						.asyncAndThen((updatedRecord) =>
							ledger
								.markRedeemed({ attendeeId, redeemedAt })
								.mapErr((error): RedeemRewardFailure => error)
								.andThen(() =>
									rewards
										.save(updatedRecord)
										.mapErr((error): RedeemRewardFailure => error)
										.map(() => {
											const success: RedeemRewardSuccess = {
												status: "redeemed",
												attendeeId,
												redeemedAt,
											};
											return success;
										}),
								),
						);
				}),
		);

	return {
		redeem,
	};
};

export { createRedeemRewardService, RedeemRewardValidationError };
export type {
	RedeemRewardDependencies,
	RedeemRewardFailure,
	RedeemRewardInput,
	RedeemRewardService,
	RedeemRewardSuccess,
};
