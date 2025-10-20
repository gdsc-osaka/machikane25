import {
	err,
	errAsync,
	ok,
	okAsync,
	Result,
	type ResultAsync,
} from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";
import {
	createRewardQrPayloadGenerator,
	createRewardRecord,
	createRewardSnapshot,
	type RewardQrEncodingError,
	type RewardRecord,
	type RewardRecordInvariantError,
	type RewardRepository,
	type RewardRepositoryError,
} from "@/domain/reward";
import type {
	MarkSurveyCompletedInput,
	SurveyLedgerError,
	SurveyLedgerPort,
} from "@/domain/survey";

type SurveyAnswers = {
	ratingPhotobooth: number;
	ratingAquarium: number;
	ratingStampRally: number;
	freeComment: string | null;
};

type SubmitSurveyInput = {
	attendeeId: string;
	answers: SurveyAnswers;
	responseId: string;
};

type SubmitSurveySuccess = {
	attendeeId: string;
	surveyStatus: "submitted";
	rewardStatus: "issued" | "redeemed";
	rewardQr: string;
};

type CreateSubmitSurveyServiceDependencies = {
	surveyLedger: Pick<SurveyLedgerPort, "markCompleted">;
	rewards: RewardRepository;
	generateQrPayload?: (
		attendeeId: string,
		issuedAt: number,
	) => Result<string, RewardQrEncodingError>;
	clock?: () => number;
};

type SubmitSurveyService = {
	submit: (
		input: SubmitSurveyInput,
	) => ResultAsync<SubmitSurveySuccess, SubmitSurveyFailure>;
};

const surveyAnswersSchema = z.object({
	ratingPhotobooth: z.number().int().min(1).max(5),
	ratingAquarium: z.number().int().min(1).max(5),
	ratingStampRally: z.number().int().min(1).max(5),
	freeComment: z.string().nullable(),
});

const submitSurveyInputSchema = z.object({
	attendeeId: z.string().min(1),
	answers: surveyAnswersSchema,
	responseId: z.string().min(1),
});

const SubmitSurveyValidationError = errorBuilder("SubmitSurveyValidationError");

type SubmitSurveyValidationError = InferError<
	typeof SubmitSurveyValidationError
>;

const RewardSnapshotError = errorBuilder(
	"RewardSnapshotError",
	z.object({ reason: z.literal("missing_qr_payload") }),
);

type RewardSnapshotError = InferError<typeof RewardSnapshotError>;

type SubmitSurveyFailure =
	| SubmitSurveyValidationError
	| SurveyLedgerError
	| RewardRepositoryError
	| RewardQrEncodingError
	| RewardRecordInvariantError
	| RewardSnapshotError;

const resolveRewardQr = (
	snapshot: ReturnType<typeof createRewardSnapshot>,
): Result<string, RewardSnapshotError> =>
	snapshot.qrPayload === null
		? err(
				RewardSnapshotError("Reward QR payload is missing.", {
					extra: { reason: "missing_qr_payload" },
				}),
			)
		: ok(snapshot.qrPayload);

const toSubmitSurveySuccess = (
	attendeeId: string,
	rewardRecord: RewardRecord,
): Result<SubmitSurveySuccess, RewardSnapshotError> =>
	resolveRewardQr(createRewardSnapshot(rewardRecord)).map((qrPayload) => ({
		attendeeId,
		surveyStatus: "submitted",
		rewardStatus: rewardRecord.redeemedAt === null ? "issued" : "redeemed",
		rewardQr: qrPayload,
	}));

const mapValidationError = (cause: unknown): SubmitSurveyValidationError =>
	SubmitSurveyValidationError("Survey submission input failed validation.", {
		cause,
	});

const createSubmitSurveyService = ({
	surveyLedger,
	rewards,
	generateQrPayload = createRewardQrPayloadGenerator(),
	clock = Date.now,
}: CreateSubmitSurveyServiceDependencies): SubmitSurveyService => {
	const toSuccess = (
		attendeeId: string,
		rewardRecord: RewardRecord,
	): Result<SubmitSurveySuccess, SubmitSurveyFailure> =>
		toSubmitSurveySuccess(attendeeId, rewardRecord).mapErr(
			(error): SubmitSurveyFailure => error,
		);

	const issueNewReward = (
		attendeeId: string,
	): ResultAsync<SubmitSurveySuccess, SubmitSurveyFailure> => {
		const issuedAt = clock();
		return generateQrPayload(attendeeId, issuedAt)
			.mapErr((error): SubmitSurveyFailure => error)
			.asyncAndThen((qrPayload) =>
				createRewardRecord({
					attendeeId,
					qrPayload,
					issuedAt,
					redeemedAt: null,
				})
					.mapErr((error): SubmitSurveyFailure => error)
					.asyncAndThen((rewardRecord) =>
						rewards
							.save(rewardRecord)
							.mapErr((error): SubmitSurveyFailure => error)
							.andThen(() => toSuccess(attendeeId, rewardRecord)),
					),
			);
	};

	const submit = (
		rawInput: SubmitSurveyInput,
	): ResultAsync<SubmitSurveySuccess, SubmitSurveyFailure> =>
		Result.fromThrowable(
			() => submitSurveyInputSchema.parse(rawInput),
			mapValidationError,
		)().asyncAndThen((input) => {
			const completedAt = clock();
			const record: MarkSurveyCompletedInput = {
				attendeeId: input.attendeeId,
				completedAt,
				responseId: input.responseId,
			};

			return surveyLedger
				.markCompleted(record)
				.mapErr((error): SubmitSurveyFailure => error)
				.andThen(() =>
					rewards
						.findByAttendeeId(input.attendeeId)
						.mapErr((error): SubmitSurveyFailure => error)
						.andThen((existing) =>
							existing === null
								? issueNewReward(input.attendeeId)
								: toSuccess(input.attendeeId, existing),
						),
				);
		});

	return {
		submit,
	};
};

export {
	createSubmitSurveyService,
	SubmitSurveyValidationError,
	RewardSnapshotError,
};
export type {
	CreateSubmitSurveyServiceDependencies,
	SubmitSurveyFailure,
	SubmitSurveyInput,
	SubmitSurveyService,
	SubmitSurveySuccess,
	SurveyAnswers,
};
