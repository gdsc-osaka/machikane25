import { z } from "zod";
import {
	createRewardQrPayloadGenerator,
	createRewardSnapshot,
	rewardRecordSchema,
	type RewardRecord,
	type RewardSnapshot,
} from "@/domain/reward";

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

type SurveyLedger = {
	markCompleted: (input: {
		attendeeId: string;
		completedAt: number;
		responseId: string;
	}) => Promise<void>;
};

type RewardGateway = {
	findByAttendeeId: (attendeeId: string) => Promise<RewardRecord | null>;
	save: (record: RewardRecord) => Promise<void>;
};

type CreateSubmitSurveyServiceDependencies = {
	surveyLedger: SurveyLedger;
	rewards: RewardGateway;
	generateQrPayload?: (attendeeId: string, issuedAt: number) => string;
	clock?: () => number;
};

type SubmitSurveyService = {
	submit: (input: SubmitSurveyInput) => Promise<SubmitSurveySuccess>;
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

const resolveRewardQr = (snapshot: RewardSnapshot): string => {
	if (snapshot.qrPayload === null) {
		throw new Error("Reward QR payload is missing from the snapshot.");
	}
	return snapshot.qrPayload;
};

const toSubmitSurveySuccess = (
	attendeeId: string,
	snapshot: RewardSnapshot,
): SubmitSurveySuccess => {
	const rewardStatus = snapshot.status === "pending" ? "issued" : snapshot.status;
	return {
		attendeeId,
		surveyStatus: "submitted",
		rewardStatus,
		rewardQr: resolveRewardQr(snapshot),
	};
};

const createSubmitSurveyService = ({
	surveyLedger,
	rewards,
	generateQrPayload = createRewardQrPayloadGenerator(),
	clock = Date.now,
}: CreateSubmitSurveyServiceDependencies): SubmitSurveyService => {
	const submit = async (
		rawInput: SubmitSurveyInput,
	): Promise<SubmitSurveySuccess> => {
		const input = submitSurveyInputSchema.parse(rawInput);

		const completedAt = clock();
		await surveyLedger.markCompleted({
			attendeeId: input.attendeeId,
			completedAt,
			responseId: input.responseId,
		});

		const existingReward = await rewards.findByAttendeeId(input.attendeeId);
		if (existingReward !== null) {
			return toSubmitSurveySuccess(
				input.attendeeId,
				createRewardSnapshot(existingReward),
			);
		}

		const issuedAt = clock();
		const qrPayload = generateQrPayload(input.attendeeId, issuedAt);

		const rewardRecord = rewardRecordSchema.parse({
			attendeeId: input.attendeeId,
			qrPayload,
			issuedAt,
			redeemedAt: null,
		});

		await rewards.save(rewardRecord);

		return toSubmitSurveySuccess(
			input.attendeeId,
			createRewardSnapshot(rewardRecord),
		);
	};

	return {
		submit,
	};
};

export { createSubmitSurveyService };
export type {
	CreateSubmitSurveyServiceDependencies,
	SubmitSurveyInput,
	SubmitSurveyService,
	SubmitSurveySuccess,
	SurveyAnswers,
};
